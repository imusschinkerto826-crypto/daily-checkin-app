import { describe, expect, it, vi, beforeEach } from "vitest";
import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";

// Mock db functions
vi.mock("../db", () => ({
  getUserById: vi.fn(),
  hasCheckedInToday: vi.fn(),
  createCheckIn: vi.fn(),
  getLastCheckIn: vi.fn(),
  getStreakDays: vi.fn(),
  getUserByUsername: vi.fn(),
  createUser: vi.fn(),
  getContactsByUserId: vi.fn(),
  getContactsCountByUserId: vi.fn(),
  createContact: vi.fn(),
  getContactById: vi.fn(),
  deleteContact: vi.fn(),
  getUserByOpenId: vi.fn(),
  upsertUser: vi.fn(),
  updateReminderSettings: vi.fn(),
  getUsersNeedingReminder: vi.fn(),
}));

// Mock utils/auth module
const mockGetCurrentUser = vi.fn();

vi.mock("../utils/auth", () => ({
  getCurrentUser: (...args: any[]) => mockGetCurrentUser(...args),
  verifyToken: vi.fn(),
  generateToken: vi.fn(),
  parseCookies: vi.fn(),
  tryGetCurrentUser: vi.fn(),
}));

import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import * as db from "../db";

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
      cookie: vi.fn(),
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("checkIns.checkIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should successfully check in", async () => {
    const ctx = createMockContext("valid-token");
    
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      username: "testuser",
      email: null,
      passwordHash: "hash",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.hasCheckedInToday).mockResolvedValue(false);
    vi.mocked(db.createCheckIn).mockResolvedValue({
      id: 1,
      userId: 1,
      checkInDate: "2024-01-15",
      createdAt: new Date(),
    });
    vi.mocked(db.getStreakDays).mockResolvedValue(5);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.checkIns.checkIn();

    expect(result.success).toBe(true);
    expect(result.streakDays).toBe(5);
  });

  it("should reject if already checked in today", async () => {
    const ctx = createMockContext("valid-token");
    
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      username: "testuser",
      email: null,
      passwordHash: "hash",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.hasCheckedInToday).mockResolvedValue(true);

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.checkIns.checkIn()).rejects.toThrow("今日已签到");
  });

  it("should reject if not logged in", async () => {
    const ctx = createMockContext();
    
    mockGetCurrentUser.mockRejectedValue(
      new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" })
    );

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.checkIns.checkIn()).rejects.toThrow("请先登录");
  });
});

describe("checkIns.status", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return check-in status", async () => {
    const ctx = createMockContext("valid-token");
    
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      username: "testuser",
      email: null,
      passwordHash: "hash",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.hasCheckedInToday).mockResolvedValue(true);
    vi.mocked(db.getLastCheckIn).mockResolvedValue({
      id: 1,
      userId: 1,
      checkInDate: "2024-01-15",
      createdAt: new Date(),
    });
    vi.mocked(db.getStreakDays).mockResolvedValue(10);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.checkIns.status();

    expect(result.hasCheckedInToday).toBe(true);
    expect(result.streakDays).toBe(10);
    expect(result.lastCheckIn).not.toBeNull();
  });

  it("should return empty status for new user", async () => {
    const ctx = createMockContext("valid-token");
    
    mockGetCurrentUser.mockResolvedValue({
      id: 1,
      username: "testuser",
      email: null,
      passwordHash: "hash",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.hasCheckedInToday).mockResolvedValue(false);
    vi.mocked(db.getLastCheckIn).mockResolvedValue(undefined);
    vi.mocked(db.getStreakDays).mockResolvedValue(0);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.checkIns.status();

    expect(result.hasCheckedInToday).toBe(false);
    expect(result.streakDays).toBe(0);
    expect(result.lastCheckIn).toBeNull();
  });
});
