import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock db module
const mockGetUserById = vi.fn();
const mockUpdateReminderSettings = vi.fn();

vi.mock("../db", () => ({
  getUserById: (...args: any[]) => mockGetUserById(...args),
  updateReminderSettings: (...args: any[]) => mockUpdateReminderSettings(...args),
  getUserByUsername: vi.fn(),
  createUser: vi.fn(),
  hasCheckedInToday: vi.fn(),
  createCheckIn: vi.fn(),
  getLastCheckIn: vi.fn(),
  getStreakDays: vi.fn(),
  getContactsByUserId: vi.fn(),
  getContactsCountByUserId: vi.fn(),
  createContact: vi.fn(),
  deleteContact: vi.fn(),
  getContactById: vi.fn(),
  getTodayUTC: vi.fn(),
  getUsersWhoMissedCheckIn: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  getUsersNeedingReminder: vi.fn(),
}));

// Mock verifyToken
const mockVerifyToken = vi.fn();

vi.mock("./auth", async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    verifyToken: (...args: any[]) => mockVerifyToken(...args),
  };
});

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { COOKIE_NAME } from "@shared/const";

type AuthenticatedUser = {
  id: number;
  username: string;
  email: string | null;
  passwordHash: string;
  role: "user" | "admin";
  reminderEnabled: boolean;
  reminderEmail: string | null;
  reminderHour: number | null;
  createdAt: Date;
  updatedAt: Date;
};

function createMockContext(token?: string): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {
        cookie: token ? `${COOKIE_NAME}=${token}` : "",
      },
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("reminder router", () => {
  const mockUser: AuthenticatedUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    passwordHash: "hashedpassword",
    role: "user",
    reminderEnabled: false,
    reminderEmail: null,
    reminderHour: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getSettings", () => {
    it("should return reminder settings for authenticated user", async () => {
      mockVerifyToken.mockResolvedValue({ userId: 1 });
      mockGetUserById.mockResolvedValue(mockUser);

      const ctx = createMockContext("valid-token");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reminder.getSettings();

      expect(result).toEqual({
        reminderEnabled: false,
        reminderEmail: null,
        reminderHour: 8,
      });
    });

    it("should throw error for unauthenticated user", async () => {
      const ctx = createMockContext();
      const caller = appRouter.createCaller(ctx);

      await expect(caller.reminder.getSettings()).rejects.toThrow("请先登录");
    });
  });

  describe("updateSettings", () => {
    it("should update reminder settings successfully", async () => {
      const updatedUser = {
        ...mockUser,
        reminderEnabled: true,
        reminderEmail: "reminder@example.com",
        reminderHour: 9,
      };

      mockVerifyToken.mockResolvedValue({ userId: 1 });
      mockGetUserById.mockResolvedValue(mockUser);
      mockUpdateReminderSettings.mockResolvedValue(updatedUser);

      const ctx = createMockContext("valid-token");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reminder.updateSettings({
        reminderEnabled: true,
        reminderEmail: "reminder@example.com",
        reminderHour: 9,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("签到提醒已开启");
      expect(result.settings.reminderEnabled).toBe(true);
      expect(result.settings.reminderEmail).toBe("reminder@example.com");
      expect(result.settings.reminderHour).toBe(9);
    });

    it("should disable reminder successfully", async () => {
      const updatedUser = {
        ...mockUser,
        reminderEnabled: false,
        reminderEmail: null,
        reminderHour: 8,
      };

      mockVerifyToken.mockResolvedValue({ userId: 1 });
      mockGetUserById.mockResolvedValue(mockUser);
      mockUpdateReminderSettings.mockResolvedValue(updatedUser);

      const ctx = createMockContext("valid-token");
      const caller = appRouter.createCaller(ctx);

      const result = await caller.reminder.updateSettings({
        reminderEnabled: false,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe("签到提醒已关闭");
    });

    it("should throw error when enabling reminder without email", async () => {
      mockVerifyToken.mockResolvedValue({ userId: 1 });
      mockGetUserById.mockResolvedValue(mockUser);

      const ctx = createMockContext("valid-token");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.reminder.updateSettings({
          reminderEnabled: true,
          reminderEmail: null,
        })
      ).rejects.toThrow("启用提醒时必须提供邮箱地址");
    });

    it("should validate email format", async () => {
      mockVerifyToken.mockResolvedValue({ userId: 1 });
      mockGetUserById.mockResolvedValue(mockUser);

      const ctx = createMockContext("valid-token");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.reminder.updateSettings({
          reminderEnabled: true,
          reminderEmail: "invalid-email",
        })
      ).rejects.toThrow();
    });

    it("should validate hour range", async () => {
      mockVerifyToken.mockResolvedValue({ userId: 1 });
      mockGetUserById.mockResolvedValue(mockUser);

      const ctx = createMockContext("valid-token");
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.reminder.updateSettings({
          reminderEnabled: true,
          reminderEmail: "test@example.com",
          reminderHour: 25,
        })
      ).rejects.toThrow();
    });
  });
});
