import { describe, expect, it, vi, beforeEach } from "vitest";
import { COOKIE_NAME } from "@shared/const";

// Mock db functions
vi.mock("../db", () => ({
  getUserById: vi.fn(),
  getContactsByUserId: vi.fn(),
  getContactsCountByUserId: vi.fn(),
  createContact: vi.fn(),
  getContactById: vi.fn(),
  deleteContact: vi.fn(),
  getUserByUsername: vi.fn(),
  createUser: vi.fn(),
  hasCheckedInToday: vi.fn(),
  createCheckIn: vi.fn(),
  getLastCheckIn: vi.fn(),
  getStreakDays: vi.fn(),
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

describe("contacts.list", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return contacts list", async () => {
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
    vi.mocked(db.getContactsByUserId).mockResolvedValue([
      {
        id: 1,
        userId: 1,
        name: "Contact 1",
        email: "contact1@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 2,
        userId: 1,
        name: "Contact 2",
        email: "contact2@example.com",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.list();

    expect(result.contacts.length).toBe(2);
    expect(result.maxContacts).toBe(3);
    expect(result.canAddMore).toBe(true);
  });

  it("should indicate cannot add more when at limit", async () => {
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
    vi.mocked(db.getContactsByUserId).mockResolvedValue([
      { id: 1, userId: 1, name: "C1", email: "c1@test.com", createdAt: new Date(), updatedAt: new Date() },
      { id: 2, userId: 1, name: "C2", email: "c2@test.com", createdAt: new Date(), updatedAt: new Date() },
      { id: 3, userId: 1, name: "C3", email: "c3@test.com", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.list();

    expect(result.contacts.length).toBe(3);
    expect(result.canAddMore).toBe(false);
  });
});

describe("contacts.add", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should add a new contact", async () => {
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
    vi.mocked(db.getContactsCountByUserId).mockResolvedValue(1);
    vi.mocked(db.createContact).mockResolvedValue({
      id: 2,
      userId: 1,
      name: "New Contact",
      email: "new@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.add({
      name: "New Contact",
      email: "new@example.com",
    });

    expect(result.success).toBe(true);
    expect(result.contact.name).toBe("New Contact");
  });

  it("should reject when at contact limit", async () => {
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
    vi.mocked(db.getContactsCountByUserId).mockResolvedValue(3);

    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.contacts.add({
        name: "New Contact",
        email: "new@example.com",
      })
    ).rejects.toThrow("最多只能添加 3 位紧急联系人");
  });

  it("should validate email format", async () => {
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

    const caller = appRouter.createCaller(ctx);
    
    await expect(
      caller.contacts.add({
        name: "New Contact",
        email: "invalid-email",
      })
    ).rejects.toThrow();
  });
});

describe("contacts.delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should delete a contact", async () => {
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
    vi.mocked(db.getContactById).mockResolvedValue({
      id: 1,
      userId: 1,
      name: "Contact",
      email: "contact@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.mocked(db.deleteContact).mockResolvedValue(true);

    const caller = appRouter.createCaller(ctx);
    const result = await caller.contacts.delete({ id: 1 });

    expect(result.success).toBe(true);
  });

  it("should reject deleting non-existent contact", async () => {
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
    vi.mocked(db.getContactById).mockResolvedValue(undefined);

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.contacts.delete({ id: 999 })).rejects.toThrow("联系人不存在");
  });

  it("should reject deleting another user's contact", async () => {
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
    vi.mocked(db.getContactById).mockResolvedValue({
      id: 1,
      userId: 2, // Different user
      name: "Contact",
      email: "contact@example.com",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const caller = appRouter.createCaller(ctx);
    
    await expect(caller.contacts.delete({ id: 1 })).rejects.toThrow("联系人不存在");
  });
});
