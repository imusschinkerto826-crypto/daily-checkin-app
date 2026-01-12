import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getCurrentUser } from "../utils/auth";

// 更新提醒设置输入验证
const updateReminderSchema = z.object({
  reminderEnabled: z.boolean(),
  reminderEmail: z.string().email("请输入有效的邮箱地址").optional().nullable(),
  reminderHour: z.number().min(0).max(23).optional(),
});

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
