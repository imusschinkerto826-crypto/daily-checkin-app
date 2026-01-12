import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { verifyToken } from "./auth";
import { COOKIE_NAME } from "@shared/const";

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
