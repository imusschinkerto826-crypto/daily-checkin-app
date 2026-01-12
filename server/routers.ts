import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { checkInsRouter } from "./routers/checkins";
import { contactsRouter } from "./routers/contacts";

export const appRouter = router({
  system: systemRouter,
  
  // 自定义用户认证
  auth: authRouter,
  
  // 签到功能
  checkIns: checkInsRouter,
  
  // 紧急联系人管理
  contacts: contactsRouter,
});

export type AppRouter = typeof appRouter;
