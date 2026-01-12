import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { authRouter } from "./routers/auth";
import { checkInsRouter } from "./routers/checkins";
import { contactsRouter } from "./routers/contacts";
import { emailRouter } from "./routers/email";
import { reminderRouter } from "./routers/reminder";

export const appRouter = router({
  system: systemRouter,
  
  // 自定义用户认证
  auth: authRouter,
  
  // 签到功能
  checkIns: checkInsRouter,
  
  // 紧急联系人管理
  contacts: contactsRouter,
  
  // 邮件功能
  email: emailRouter,
  
  // 签到提醒设置
  reminder: reminderRouter,
});

export type AppRouter = typeof appRouter;
