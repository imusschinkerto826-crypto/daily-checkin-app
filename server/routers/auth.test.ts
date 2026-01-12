import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";

// Mock bcrypt
vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("$2b$10$hashedpassword"),
    compare: vi.fn().mockImplementation((password: string, hash: string) => {
      return Promise.resolve(password === "testpassword123");
    }),
  },
}));

// Mock db functions
vi.mock("../db", () => ({
  getUserByUsername: vi.fn(),
  getUserById: vi.fn(),
  createUser: vi.fn(),
}));

import * as db from "../db";

type CookieCall = {
  name: string;
  value?: string;
  options: Record<string, unknown>;
};

function createMockContext(cookieHeader?: string): { ctx: TrpcContext; cookies: CookieCall[]; clearedCookies: CookieCall[] } {
  const cookies: CookieCall[] = [];
  const clearedCookies: CookieCall[] = [];

  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {
        cookie: cookieHeader || "",
      },
    } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => {
        cookies.push({ name, value, options });
      },
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };

  return { ctx, cookies, clearedCookies };
}

describe("auth.register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should register a new user successfully", async () => {
    const { ctx, cookies } = createMockContext();
    
    vi.mocked(db.getUserByUsername).mockResolvedValue(undefined);
    vi.mocked(db.createUser).mockResolvedValue({
      id: 1,
      username: "testuser",
      email: "test@example.com",
      passwordHash: "$2b$10$hashedpassword",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.register({
      username: "testuser",
      password: "testpassword123",
      email: "test@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.user.username).toBe("testuser");
    expect(cookies.length).toBeGreaterThan(0);
  });

  it("should reject duplicate username", async () => {
    const { ctx } = createMockContext();
    
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      username: "existinguser",
      email: null,
      passwordHash: "$2b$10$hashedpassword",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.register({
        username: "existinguser",
        password: "testpassword123",
      })
    ).rejects.toThrow("用户名已被使用");
  });

  it("should validate username format", async () => {
    const { ctx } = createMockContext();
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.register({
        username: "ab", // too short
        password: "testpassword123",
      })
    ).rejects.toThrow();
  });
});

describe("auth.login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should login successfully with correct credentials", async () => {
    const { ctx, cookies } = createMockContext();
    
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      username: "testuser",
      email: "test@example.com",
      passwordHash: "$2b$10$hashedpassword",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({
      username: "testuser",
      password: "testpassword123",
    });

    expect(result.success).toBe(true);
    expect(result.user.username).toBe("testuser");
    expect(cookies.length).toBeGreaterThan(0);
  });

  it("should reject invalid username", async () => {
    const { ctx } = createMockContext();
    
    vi.mocked(db.getUserByUsername).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.login({
        username: "nonexistent",
        password: "testpassword123",
      })
    ).rejects.toThrow("用户名或密码错误");
  });

  it("should reject wrong password", async () => {
    const { ctx } = createMockContext();
    
    vi.mocked(db.getUserByUsername).mockResolvedValue({
      id: 1,
      username: "testuser",
      email: null,
      passwordHash: "$2b$10$hashedpassword",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.login({
        username: "testuser",
        password: "wrongpassword",
      })
    ).rejects.toThrow("用户名或密码错误");
  });
});

describe("auth.logout", () => {
  it("should clear session cookie on logout", async () => {
    const { ctx, clearedCookies } = createMockContext();
    
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
    expect(clearedCookies.length).toBe(1);
  });
});
