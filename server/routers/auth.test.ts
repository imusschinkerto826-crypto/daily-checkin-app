import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "../routers";
import type { TrpcContext } from "../_core/context";
import { COOKIE_NAME } from "@shared/const";

// Mock bcrypt
const mockBcryptCompare = vi.fn();
const mockBcryptHash = vi.fn().mockResolvedValue("$2b$10$newhashedpassword");

vi.mock("bcrypt", () => ({
  default: {
    hash: (...args: any[]) => mockBcryptHash(...args),
    compare: (...args: any[]) => mockBcryptCompare(...args),
  },
}));

// Mock jose
const mockJwtVerify = vi.fn();

vi.mock("jose", () => ({
  SignJWT: vi.fn().mockImplementation(() => ({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue("mock-jwt-token"),
  })),
  jwtVerify: (...args: any[]) => mockJwtVerify(...args),
}));

// Mock db functions
const mockGetUserByUsername = vi.fn();
const mockGetUserById = vi.fn();
const mockCreateUser = vi.fn();
const mockUpdateUserPassword = vi.fn();

vi.mock("../db", () => ({
  getUserByUsername: (...args: any[]) => mockGetUserByUsername(...args),
  getUserById: (...args: any[]) => mockGetUserById(...args),
  createUser: (...args: any[]) => mockCreateUser(...args),
  updateUserPassword: (...args: any[]) => mockUpdateUserPassword(...args),
}));

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
    mockBcryptCompare.mockImplementation((password: string, hash: string) => {
      return Promise.resolve(password === "testpassword123");
    });
  });

  it("should register a new user successfully", async () => {
    const { ctx, cookies } = createMockContext();
    
    mockGetUserByUsername.mockResolvedValue(undefined);
    mockCreateUser.mockResolvedValue({
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
    
    mockGetUserByUsername.mockResolvedValue({
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
    mockBcryptCompare.mockImplementation((password: string, hash: string) => {
      return Promise.resolve(password === "testpassword123");
    });
  });

  it("should login successfully with correct credentials", async () => {
    const { ctx, cookies } = createMockContext();
    
    mockGetUserByUsername.mockResolvedValue({
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
    
    mockGetUserByUsername.mockResolvedValue(undefined);

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
    
    mockGetUserByUsername.mockResolvedValue({
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

describe("auth.changePassword", () => {
  const mockUser = {
    id: 1,
    username: "testuser",
    email: "test@example.com",
    passwordHash: "$2b$10$currenthashedpassword",
    role: "user" as const,
    reminderEnabled: false,
    reminderEmail: null,
    reminderHour: 8,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should change password successfully", async () => {
    const { ctx } = createMockContext(`${COOKIE_NAME}=valid-token`);
    
    // Mock jwtVerify to return valid payload
    mockJwtVerify.mockResolvedValue({
      payload: { userId: 1, username: "testuser" },
    });
    mockGetUserById.mockResolvedValue(mockUser);
    mockBcryptCompare
      .mockResolvedValueOnce(true) // current password is correct
      .mockResolvedValueOnce(false); // new password is different
    mockUpdateUserPassword.mockResolvedValue(true);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.changePassword({
      currentPassword: "currentpassword",
      newPassword: "newpassword123",
      confirmPassword: "newpassword123",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("密码修改成功");
    expect(mockUpdateUserPassword).toHaveBeenCalledWith(1, "$2b$10$newhashedpassword");
  });

  it("should reject if current password is wrong", async () => {
    const { ctx } = createMockContext(`${COOKIE_NAME}=valid-token`);
    
    mockJwtVerify.mockResolvedValue({
      payload: { userId: 1, username: "testuser" },
    });
    mockGetUserById.mockResolvedValue(mockUser);
    mockBcryptCompare.mockResolvedValue(false); // current password is wrong

    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.changePassword({
        currentPassword: "wrongpassword",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      })
    ).rejects.toThrow("当前密码错误");
  });

  it("should reject if new password is same as current", async () => {
    const { ctx } = createMockContext(`${COOKIE_NAME}=valid-token`);
    
    mockJwtVerify.mockResolvedValue({
      payload: { userId: 1, username: "testuser" },
    });
    mockGetUserById.mockResolvedValue(mockUser);
    mockBcryptCompare
      .mockResolvedValueOnce(true) // current password is correct
      .mockResolvedValueOnce(true); // new password is same as current

    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.changePassword({
        currentPassword: "currentpassword",
        newPassword: "currentpassword",
        confirmPassword: "currentpassword",
      })
    ).rejects.toThrow("新密码不能与当前密码相同");
  });

  it("should reject if not authenticated", async () => {
    const { ctx } = createMockContext(); // no cookie
    
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.changePassword({
        currentPassword: "currentpassword",
        newPassword: "newpassword123",
        confirmPassword: "newpassword123",
      })
    ).rejects.toThrow("请先登录");
  });

  it("should validate password confirmation", async () => {
    const { ctx } = createMockContext(`${COOKIE_NAME}=valid-token`);
    
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.changePassword({
        currentPassword: "currentpassword",
        newPassword: "newpassword123",
        confirmPassword: "differentpassword",
      })
    ).rejects.toThrow();
  });

  it("should validate minimum password length", async () => {
    const { ctx } = createMockContext(`${COOKIE_NAME}=valid-token`);
    
    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.auth.changePassword({
        currentPassword: "currentpassword",
        newPassword: "short",
        confirmPassword: "short",
      })
    ).rejects.toThrow();
  });
});
