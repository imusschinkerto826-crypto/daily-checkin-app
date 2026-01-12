import { int, mysqlTable, text, timestamp, varchar, uniqueIndex, index, mysqlEnum } from "drizzle-orm/mysql-core";

/**
 * 用户表 - 自定义用户名/密码认证
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  /** 用户名，用于登录，必须唯一 */
  username: varchar("username", { length: 50 }).notNull().unique(),
  /** 用户邮箱，可选，用于未来密码找回 */
  email: varchar("email", { length: 255 }),
  /** bcrypt 哈希后的密码 */
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  /** 用户角色 */
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 紧急联系人表
 */
export const emergencyContacts = mysqlTable("emergency_contacts", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联的用户 ID */
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** 紧急联系人姓名 */
  name: varchar("name", { length: 100 }).notNull(),
  /** 紧急联系人邮箱 */
  email: varchar("email", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => [
  index("idx_emergency_contacts_user_id").on(table.userId),
  uniqueIndex("idx_emergency_contacts_user_email").on(table.userId, table.email),
]);

export type EmergencyContact = typeof emergencyContacts.$inferSelect;
export type InsertEmergencyContact = typeof emergencyContacts.$inferInsert;

/**
 * 签到记录表
 */
export const checkIns = mysqlTable("check_ins", {
  id: int("id").autoincrement().primaryKey(),
  /** 关联的用户 ID */
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  /** 签到日期 (UTC)，格式: YYYY-MM-DD */
  checkInDate: varchar("check_in_date", { length: 10 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("idx_check_ins_user_date").on(table.userId, table.checkInDate),
]);

export type CheckIn = typeof checkIns.$inferSelect;
export type InsertCheckIn = typeof checkIns.$inferInsert;
