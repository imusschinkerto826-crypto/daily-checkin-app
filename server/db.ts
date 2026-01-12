import { eq, and, sql, desc, gte, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { users, emergencyContacts, checkIns, InsertUser, InsertEmergencyContact, User, EmergencyContact, CheckIn } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ==================== 用户相关操作 ====================

/**
 * 通过用户名获取用户
 */
export async function getUserByUsername(username: string): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 通过 ID 获取用户
 */
export async function getUserById(id: number): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 创建新用户
 */
export async function createUser(data: { username: string; passwordHash: string; email?: string }): Promise<User> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(users).values({
    username: data.username,
    passwordHash: data.passwordHash,
    email: data.email || null,
  });

  const newUser = await getUserByUsername(data.username);
  if (!newUser) throw new Error("Failed to create user");
  return newUser;
}

// ==================== 紧急联系人相关操作 ====================

/**
 * 获取用户的所有紧急联系人
 */
export async function getContactsByUserId(userId: number): Promise<EmergencyContact[]> {
  const db = await getDb();
  if (!db) return [];

  return await db.select().from(emergencyContacts).where(eq(emergencyContacts.userId, userId));
}

/**
 * 获取用户的紧急联系人数量
 */
export async function getContactsCountByUserId(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  const result = await db.select({ count: sql<number>`COUNT(*)` }).from(emergencyContacts).where(eq(emergencyContacts.userId, userId));
  return result[0]?.count || 0;
}

/**
 * 添加紧急联系人
 */
export async function createContact(data: { userId: number; name: string; email: string }): Promise<EmergencyContact> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(emergencyContacts).values({
    userId: data.userId,
    name: data.name,
    email: data.email,
  });

  const contacts = await db.select().from(emergencyContacts)
    .where(and(eq(emergencyContacts.userId, data.userId), eq(emergencyContacts.email, data.email)))
    .limit(1);
  
  if (!contacts[0]) throw new Error("Failed to create contact");
  return contacts[0];
}

/**
 * 删除紧急联系人
 */
export async function deleteContact(contactId: number, userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const result = await db.delete(emergencyContacts)
    .where(and(eq(emergencyContacts.id, contactId), eq(emergencyContacts.userId, userId)));
  
  return (result as any).affectedRows > 0;
}

/**
 * 通过 ID 获取紧急联系人
 */
export async function getContactById(contactId: number): Promise<EmergencyContact | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(emergencyContacts).where(eq(emergencyContacts.id, contactId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ==================== 签到相关操作 ====================

/**
 * 获取今日 UTC 日期字符串
 */
export function getTodayUTC(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * 检查用户今日是否已签到
 */
export async function hasCheckedInToday(userId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const today = getTodayUTC();
  const result = await db.select().from(checkIns)
    .where(and(eq(checkIns.userId, userId), eq(checkIns.checkInDate, today)))
    .limit(1);
  
  return result.length > 0;
}

/**
 * 执行签到
 */
export async function createCheckIn(userId: number): Promise<CheckIn> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = getTodayUTC();
  
  await db.insert(checkIns).values({
    userId,
    checkInDate: today,
  });

  const result = await db.select().from(checkIns)
    .where(and(eq(checkIns.userId, userId), eq(checkIns.checkInDate, today)))
    .limit(1);
  
  if (!result[0]) throw new Error("Failed to create check-in");
  return result[0];
}

/**
 * 获取用户最后一次签到记录
 */
export async function getLastCheckIn(userId: number): Promise<CheckIn | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.checkInDate))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 计算连续签到天数
 */
export async function getStreakDays(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // 获取用户所有签到记录，按日期降序
  const allCheckIns = await db.select({ checkInDate: checkIns.checkInDate })
    .from(checkIns)
    .where(eq(checkIns.userId, userId))
    .orderBy(desc(checkIns.checkInDate));

  if (allCheckIns.length === 0) return 0;

  const today = new Date(getTodayUTC());
  let streak = 0;
  let expectedDate = today;

  for (const record of allCheckIns) {
    const checkInDate = new Date(record.checkInDate);
    const diffDays = Math.floor((expectedDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // 当天签到
      streak++;
      expectedDate = new Date(expectedDate.getTime() - 24 * 60 * 60 * 1000);
    } else if (diffDays === 1 && streak === 0) {
      // 昨天签到（今天还没签到的情况）
      streak++;
      expectedDate = new Date(checkInDate.getTime() - 24 * 60 * 60 * 1000);
    } else {
      // 连续中断
      break;
    }
  }

  return streak;
}

/**
 * 获取昨天没有签到但有紧急联系人的用户
 */
export async function getUsersWhoMissedCheckIn(): Promise<Array<User & { contacts: EmergencyContact[] }>> {
  const db = await getDb();
  if (!db) return [];

  // 获取昨天的日期
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // 获取所有用户
  const allUsers = await db.select().from(users);
  
  const result: Array<User & { contacts: EmergencyContact[] }> = [];

  for (const user of allUsers) {
    // 检查用户是否有紧急联系人
    const contacts = await getContactsByUserId(user.id);
    if (contacts.length === 0) continue;

    // 检查用户昨天是否签到
    const checkIn = await db.select().from(checkIns)
      .where(and(eq(checkIns.userId, user.id), eq(checkIns.checkInDate, yesterdayStr)))
      .limit(1);

    if (checkIn.length === 0) {
      result.push({ ...user, contacts });
    }
  }

  return result;
}


// ==================== OAuth 兼容函数（保持框架兼容性） ====================

/**
 * 通过 OpenID 获取用户（OAuth 兼容）
 * 注意：本应用使用自定义认证，此函数仅用于框架兼容
 */
export async function getUserByOpenId(openId: string): Promise<User | undefined> {
  // 在自定义认证中，我们不使用 openId
  // 返回 undefined 让框架知道用户不存在
  return undefined;
}

/**
 * 更新或插入用户（OAuth 兼容）
 * 注意：本应用使用自定义认证，此函数仅用于框架兼容
 */
export async function upsertUser(user: { 
  openId: string; 
  name?: string | null; 
  email?: string | null;
  loginMethod?: string | null;
  lastSignedIn?: Date;
  role?: 'user' | 'admin';
}): Promise<void> {
  // 在自定义认证中，我们不使用 OAuth upsert
  // 此函数仅用于保持框架兼容性
  console.log("[Auth] OAuth upsertUser called but ignored - using custom auth");
}


// ==================== 签到提醒相关操作 ====================

/**
 * 更新用户的签到提醒设置
 */
export async function updateReminderSettings(userId: number, settings: {
  reminderEnabled: boolean;
  reminderEmail?: string | null;
  reminderHour?: number;
}): Promise<User | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  await db.update(users)
    .set({
      reminderEnabled: settings.reminderEnabled,
      reminderEmail: settings.reminderEmail || null,
      reminderHour: settings.reminderHour ?? 8,
    })
    .where(eq(users.id, userId));

  return getUserById(userId);
}

/**
 * 获取需要发送签到提醒的用户（指定小时）
 * 返回启用了提醒、有提醒邮箱、且今天还没签到的用户
 */
export async function getUsersNeedingReminder(hour: number): Promise<User[]> {
  const db = await getDb();
  if (!db) return [];

  const today = getTodayUTC();

  // 获取所有启用提醒且提醒时间匹配的用户
  const usersWithReminder = await db.select()
    .from(users)
    .where(
      and(
        eq(users.reminderEnabled, true),
        eq(users.reminderHour, hour)
      )
    );

  // 过滤掉今天已经签到的用户
  const result: User[] = [];
  for (const user of usersWithReminder) {
    if (!user.reminderEmail) continue;
    
    const todayCheckIn = await db.select()
      .from(checkIns)
      .where(and(eq(checkIns.userId, user.id), eq(checkIns.checkInDate, today)))
      .limit(1);
    
    if (todayCheckIn.length === 0) {
      result.push(user);
    }
  }

  return result;
}
