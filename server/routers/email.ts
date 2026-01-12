import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { verifyToken } from "./auth";
import { COOKIE_NAME } from "@shared/const";
import { sendTestEmail } from "../services/email";

// 发送测试邮件输入验证
const sendTestEmailSchema = z.object({
  email: z.string().email("请输入有效的邮箱地址"),
});

/**
 * 从请求中获取当前用户
 */
async function getCurrentUser(ctx: any) {
  const cookies = ctx.req.headers.cookie || "";
  const cookieMap = new Map(
    cookies.split(";").map((c: string) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );
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

export const emailRouter = router({
  /**
   * 发送测试邮件
   */
  sendTest: publicProcedure
    .input(sendTestEmailSchema)
    .mutation(async ({ input, ctx }) => {
      // 验证用户已登录
      await getCurrentUser(ctx);

      // 发送测试邮件
      const success = await sendTestEmail(input.email);

      if (!success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "邮件发送失败，请检查邮箱配置或稍后重试",
        });
      }

      return {
        success: true,
        message: `测试邮件已发送到 ${input.email}`,
      };
    }),
});
