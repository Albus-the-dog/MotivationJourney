import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";
import { verify } from "argon2";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { newEmail, currentPassword } = await request.json();

    if (!newEmail || !currentPassword) {
      return Response.json({ error: "New email and current password are required" }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Check email not already taken
    const [existing] = await sql`
      SELECT id FROM auth_users WHERE email = ${newEmail} AND id != ${session.user.id}
    `;
    if (existing) {
      return Response.json({ error: "That email is already in use" }, { status: 409 });
    }

    // Verify current password
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

    await sql`
      UPDATE auth_users SET email = ${newEmail} WHERE id = ${session.user.id}
    `;

    return Response.json({ success: true, email: newEmail });
  } catch (error) {
    console.error("POST /api/profile/change-email error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
