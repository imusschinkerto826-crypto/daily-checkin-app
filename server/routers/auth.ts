import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import { SignJWT, jwtVerify } from "jose";
import { publicProcedure, router, protectedProcedure } from "../_core/trpc";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import * as db from "../db";
import { ENV } from "../_core/env";

const SALT_ROUNDS = 10;
const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "default-secret-change-me");

// 注册输入验证
const registerSchema = z.object({
  username: z.string().min(3, "用户名至少3个字符").max(50, "用户名最多50个字符")
    .regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
  password: z.string().min(6, "密码至少6个字符").max(100, "密码最多100个字符"),
  email: z.string().email("邮箱格式不正确").optional().or(z.literal("")),
});

// 登录输入验证
const loginSchema = z.object({
  username: z.string().min(1, "请输入用户名"),
  password: z.string().min(1, "请输入密码"),
});

/**
 * 生成 JWT Token
 */
async function generateToken(userId: number, username: string): Promise<string> {
  return new SignJWT({ userId, username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
    };
  } catch {
    return null;
  }
}

export const authRouter = router({
  /**
   * 用户注册
   */
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input, ctx }) => {
      // 检查用户名是否已存在
      const existingUser = await db.getUserByUsername(input.username);
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "用户名已被使用",
        });
      }

      // 哈希密码
      const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);

      // 创建用户
      const user = await db.createUser({
        username: input.username,
        passwordHash,
        email: input.email || undefined,
      });

      // 生成 Token
      const token = await generateToken(user.id, user.username);

      // 设置 Cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    }),

  /**
   * 用户登录
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input, ctx }) => {
      // 查找用户
      const user = await db.getUserByUsername(input.username);
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        });
      }

      // 验证密码
      const isValid = await bcrypt.compare(input.password, user.passwordHash);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "用户名或密码错误",
        });
      }

      // 生成 Token
      const token = await generateToken(user.id, user.username);

      // 设置 Cookie
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, {
        ...cookieOptions,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        success: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      };
    }),

  /**
   * 获取当前用户信息
   */
  me: publicProcedure.query(async ({ ctx }) => {
    // 从 Cookie 获取 Token
    const cookies = ctx.req.headers.cookie || "";
    const cookieMap = new Map(
      cookies.split(";").map((c) => {
        const [key, ...val] = c.trim().split("=");
        return [key, val.join("=")];
      })
    );
    const token = cookieMap.get(COOKIE_NAME);

    if (!token) {
      return null;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return null;
    }

    const user = await db.getUserById(payload.userId);
    if (!user) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }),

  /**
   * 用户登出
   */
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true };
  }),
});
