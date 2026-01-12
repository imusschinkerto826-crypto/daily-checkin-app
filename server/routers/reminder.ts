import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { verifyToken } from "./auth";
import { COOKIE_NAME } from "@shared/const";

// 更新提醒设置输入验证
const updateReminderSchema = z.object({
  reminderEnabled: z.boolean(),
  reminderEmail: z.string().email("请输入有效的邮箱地址").optional().nullable(),
  reminderHour: z.number().min(0).max(23).optional(),
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

export const reminderRouter = router({
  /**
   * 获取当前用户的提醒设置
   */
  getSettings: publicProcedure.query(async ({ ctx }) => {
    const user = await getCurrentUser(ctx);

    return {
      reminderEnabled: user.reminderEnabled,
      reminderEmail: user.reminderEmail,
      reminderHour: user.reminderHour,
    };
  }),

  /**
   * 更新提醒设置
   */
  updateSettings: publicProcedure
    .input(updateReminderSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await getCurrentUser(ctx);

      // 如果启用提醒，必须提供邮箱
      if (input.reminderEnabled && !input.reminderEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "启用提醒时必须提供邮箱地址",
        });
      }

      const updatedUser = await db.updateReminderSettings(user.id, {
        reminderEnabled: input.reminderEnabled,
        reminderEmail: input.reminderEmail,
        reminderHour: input.reminderHour ?? 8,
      });

      if (!updatedUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "更新设置失败",
        });
      }

      return {
        success: true,
        message: input.reminderEnabled ? "签到提醒已开启" : "签到提醒已关闭",
        settings: {
          reminderEnabled: updatedUser.reminderEnabled,
          reminderEmail: updatedUser.reminderEmail,
          reminderHour: updatedUser.reminderHour,
        },
      };
    }),
});
