import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { verifyToken } from "./auth";
import { COOKIE_NAME } from "@shared/const";

const MAX_CONTACTS = 3;

// 添加联系人输入验证
const addContactSchema = z.object({
  name: z.string().min(1, "请输入联系人姓名").max(100, "姓名最多100个字符"),
  email: z.string().email("请输入有效的邮箱地址"),
});

// 删除联系人输入验证
const deleteContactSchema = z.object({
  id: z.number().int().positive("无效的联系人ID"),
});

/**
 * 从请求中获取当前用户
 */
async function getCurrentUser(ctx: any) {
  const cookies = ctx.req.headers.cookie || "";
  const cookieMap = new Map(
    cookies.split(";").map((c: string) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );
  const token = cookieMap.get(COOKIE_NAME);

  if (!token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "请先登录",
    });
  }

  const payload = await verifyToken(token as string);
  if (!payload) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "登录已过期，请重新登录",
    });
  }

  const user = await db.getUserById(payload.userId);
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "用户不存在",
    });
  }

  return user;
}

export const contactsRouter = router({
  /**
   * 获取所有紧急联系人
   */
  list: publicProcedure.query(async ({ ctx }) => {
    const user = await getCurrentUser(ctx);
    const contacts = await db.getContactsByUserId(user.id);

    return {
      contacts: contacts.map((c) => ({
        id: c.id,
        name: c.name,
        email: c.email,
        createdAt: c.createdAt,
      })),
      maxContacts: MAX_CONTACTS,
      canAddMore: contacts.length < MAX_CONTACTS,
    };
  }),

  /**
   * 添加紧急联系人
   */
  add: publicProcedure
    .input(addContactSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await getCurrentUser(ctx);

      // 检查联系人数量限制
      const count = await db.getContactsCountByUserId(user.id);
      if (count >= MAX_CONTACTS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `最多只能添加 ${MAX_CONTACTS} 位紧急联系人`,
        });
      }

      // 添加联系人
      const contact = await db.createContact({
        userId: user.id,
        name: input.name,
        email: input.email,
      });

      return {
        success: true,
        contact: {
          id: contact.id,
          name: contact.name,
          email: contact.email,
          createdAt: contact.createdAt,
        },
      };
    }),

  /**
   * 删除紧急联系人
   */
  delete: publicProcedure
    .input(deleteContactSchema)
    .mutation(async ({ input, ctx }) => {
      const user = await getCurrentUser(ctx);

      // 验证联系人是否属于当前用户
      const contact = await db.getContactById(input.id);
      if (!contact || contact.userId !== user.id) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "联系人不存在",
        });
      }

      // 删除联系人
      const deleted = await db.deleteContact(input.id, user.id);
      if (!deleted) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "删除失败，请重试",
        });
      }

      return { success: true };
    }),
});
