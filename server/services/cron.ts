import cron from "node-cron";
import * as db from "../db";
import { sendMissedCheckInAlert } from "./email";

/**
 * 检查未签到用户并发送提醒邮件
 */
async function checkMissedCheckIns(): Promise<void> {
  console.log("[Cron] Starting missed check-in scan...");

  try {
    // 获取昨天没有签到但有紧急联系人的用户
    const missedUsers = await db.getUsersWhoMissedCheckIn();
    
    if (missedUsers.length === 0) {
      console.log("[Cron] No users missed check-in yesterday");
      return;
    }

    console.log(`[Cron] Found ${missedUsers.length} users who missed check-in`);

    // 获取昨天的日期字符串
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const missedDate = yesterday.toISOString().split("T")[0];

    // 统计发送结果
    let successCount = 0;
    let failCount = 0;

    // 遍历每个用户，发送邮件给其紧急联系人
    for (const user of missedUsers) {
      console.log(`[Cron] Processing user: ${user.username} (${user.contacts.length} contacts)`);

      for (const contact of user.contacts) {
        const success = await sendMissedCheckInAlert({
          contactName: contact.name,
          contactEmail: contact.email,
          userName: user.username,
          missedDate,
        });

        if (success) {
          successCount++;
        } else {
          failCount++;
        }

        // 添加小延迟避免触发速率限制
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(`[Cron] Completed. Sent: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error("[Cron] Error during missed check-in scan:", error);
  }
}

/**
 * 初始化定时任务
 * 每天 UTC 01:00 执行检查
 */
export function initCronJobs(): void {
  // 每天 UTC 01:00 执行 (cron 表达式: 分 时 日 月 周)
  cron.schedule("0 1 * * *", async () => {
    console.log("[Cron] Triggered at UTC 01:00");
    await checkMissedCheckIns();
  }, {
    timezone: "UTC",
  });

  console.log("[Cron] Scheduled daily check at UTC 01:00");
}

/**
 * 手动触发检查（用于测试）
 */
export async function triggerManualCheck(): Promise<void> {
  console.log("[Cron] Manual trigger requested");
  await checkMissedCheckIns();
}
