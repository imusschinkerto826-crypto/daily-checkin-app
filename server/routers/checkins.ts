import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { getCurrentUser } from "../utils/auth";

export const checkInsRouter = router({
  /**
   * 执行今日签到
   */
  checkIn: publicProcedure.mutation(async ({ ctx }) => {
    const user = await getCurrentUser(ctx);

    // 检查今日是否已签到
    const hasCheckedIn = await db.hasCheckedInToday(user.id);
    if (hasCheckedIn) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "今日已签到",
      });
    }

    // 执行签到
    const checkIn = await db.createCheckIn(user.id);

    // 获取连续签到天数
    const streakDays = await db.getStreakDays(user.id);

    return {
      success: true,
      checkIn: {
        id: checkIn.id,
        checkInDate: checkIn.checkInDate,
        createdAt: checkIn.createdAt,
      },
      streakDays,
    };
  }),

  /**
   * 获取签到状态
   */
  status: publicProcedure.query(async ({ ctx }) => {
    const user = await getCurrentUser(ctx);

    // 检查今日是否已签到
    const hasCheckedInToday = await db.hasCheckedInToday(user.id);

    // 获取最后一次签到记录
    const lastCheckIn = await db.getLastCheckIn(user.id);

    // 获取连续签到天数
    const streakDays = await db.getStreakDays(user.id);

    return {
      hasCheckedInToday,
      lastCheckIn: lastCheckIn
        ? {
            id: lastCheckIn.id,
            checkInDate: lastCheckIn.checkInDate,
            createdAt: lastCheckIn.createdAt,
          }
        : null,
      streakDays,
    };
  }),
});
