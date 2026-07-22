import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { hash, verify } from "argon2";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return Response.json({ error: "Both passwords are required" }, { status: 400 });
    }
    if (newPassword.length < 6) {
      return Response.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    const [account] = await sql`
      SELECT password FROM auth_accounts
      WHERE "userId" = ${session.user.id} AND provider = 'credentials'
    `;

    if (!account?.password) {
      return Response.json({ error: "No password set on this account" }, { status: 400 });
    }

    const valid = await verify(account.password, currentPassword);
    if (!valid) {
      return Response.json({ error: "Current password is incorrect" }, { status: 401 });
    }

    const hashed = await hash(newPassword);
    await sql`
      UPDATE auth_accounts SET password = ${hashed}
      WHERE "userId" = ${session.user.id} AND provider = 'credentials'
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("POST /api/profile/change-password error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
