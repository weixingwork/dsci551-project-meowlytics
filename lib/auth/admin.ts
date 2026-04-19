import { env } from "@/lib/env";

interface AdminUserLike {
  email: string;
}

const adminEmailSet = new Set(env.ADMIN_EMAILS);

export function isAdminUser(user: AdminUserLike): boolean {
  return adminEmailSet.size > 0 && adminEmailSet.has(user.email.toLowerCase());
}
