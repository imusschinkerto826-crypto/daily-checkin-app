import { TRPCError } from "@trpc/server";
import { SignJWT, jwtVerify } from "jose";
import { COOKIE_NAME } from "@shared/const";
import { ENV } from "../_core/env";
import * as db from "../db";

const JWT_SECRET = new TextEncoder().encode(ENV.cookieSecret || "default-secret-change-me");

/**
 * 生成 JWT Token
 */
export async function generateToken(userId: number, username: string): Promise<string> {
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

/**
 * 解析请求中的 Cookie
 */
export function parseCookies(cookieHeader: string): Map<string, string> {
  return new Map(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );
}

/**
 * 从请求上下文中获取当前登录用户
 * @throws TRPCError 如果用户未登录或 token 无效
 */
export async function getCurrentUser(ctx: any) {
  const cookies = ctx.req.headers.cookie || "";
  const cookieMap = parseCookies(cookies);
  const token = cookieMap.get(COOKIE_NAME);

  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "请先登录",
    });
  }

  const payload = await verifyToken(token as string);
  if (!payload) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "登录已过期，请重新登录",
    });
  }

  const user = await db.getUserById(payload.userId);
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "用户不存在",
    });
  }

  return user;
}

/**
 * 尝试从请求上下文中获取当前用户（不抛出错误）
 * @returns 用户对象或 null
 */
export async function tryGetCurrentUser(ctx: any) {
  try {
    return await getCurrentUser(ctx);
  } catch {
    return null;
  }
}
