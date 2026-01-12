import cron from "node-cron";
import * as db from "../db";
import { sendMissedCheckInAlert, sendCheckInReminder } from "./email";

/**
 * 检查未签到用户并发送提醒邮件给紧急联系人
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
 * 发送签到提醒邮件给用户
 */
async function sendCheckInReminders(hour: number): Promise<void> {
  console.log(`[Cron] Starting check-in reminder scan for hour ${hour}...`);

  try {
    // 获取需要发送提醒的用户
    const usersNeedingReminder = await db.getUsersNeedingReminder(hour);
    
    if (usersNeedingReminder.length === 0) {
      console.log(`[Cron] No users need reminder at hour ${hour}`);
      return;
    }

    console.log(`[Cron] Found ${usersNeedingReminder.length} users needing reminder`);

    // 统计发送结果
    let successCount = 0;
    let failCount = 0;

    for (const user of usersNeedingReminder) {
      if (!user.reminderEmail) continue;

      const success = await sendCheckInReminder({
        userName: user.username,
        userEmail: user.reminderEmail,
      });

      if (success) {
        successCount++;
        console.log(`[Cron] Sent reminder to ${user.username}`);
      } else {
        failCount++;
        console.log(`[Cron] Failed to send reminder to ${user.username}`);
      }

      // 添加小延迟避免触发速率限制
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log(`[Cron] Reminder completed. Sent: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error("[Cron] Error during check-in reminder scan:", error);
  }
}

/**
 * 初始化定时任务
 */
export function initCronJobs(): void {
  // 每天 UTC 01:00 执行未签到检查（通知紧急联系人）
  cron.schedule("0 1 * * *", async () => {
    console.log("[Cron] Triggered missed check-in scan at UTC 01:00");
    await checkMissedCheckIns();
  }, {
    timezone: "UTC",
  });

  // 每小时执行签到提醒检查
  // 这样可以支持用户设置任意小时的提醒时间
  cron.schedule("0 * * * *", async () => {
    const currentHour = new Date().getUTCHours();
    console.log(`[Cron] Triggered check-in reminder scan at UTC hour ${currentHour}`);
    await sendCheckInReminders(currentHour);
  }, {
    timezone: "UTC",
  });

  console.log("[Cron] Scheduled tasks:");
  console.log("  - Daily missed check-in scan at UTC 01:00");
  console.log("  - Hourly check-in reminder scan");
}

/**
 * 手动触发未签到检查（用于测试）
 */
export async function triggerManualCheck(): Promise<void> {
  console.log("[Cron] Manual trigger requested for missed check-in scan");
  await checkMissedCheckIns();
}

/**
 * 手动触发签到提醒（用于测试）
 */
export async function triggerManualReminder(hour?: number): Promise<void> {
  const targetHour = hour ?? new Date().getUTCHours();
  console.log(`[Cron] Manual trigger requested for check-in reminder at hour ${targetHour}`);
  await sendCheckInReminders(targetHour);
}
