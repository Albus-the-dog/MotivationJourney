import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const [user] = await sql`
      SELECT id, name, email, image, avatar FROM auth_users WHERE id = ${session.user.id}
    `;
    return Response.json(user || {});
  } catch (error) {
    console.error("GET /api/profile error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, avatar, image } = await request.json();

    const setClauses = [];
    const values = [];
    let idx = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${idx++}`);
      values.push(name);
    }
    if (avatar !== undefined) {
      setClauses.push(`avatar = $${idx++}`);
      values.push(avatar);
    }
    if (image !== undefined) {
      setClauses.push(`image = $${idx++}`);
      values.push(image);
    }

    if (setClauses.length === 0) {
      return Response.json({ error: "Nothing to update" }, { status: 400 });
    }

    values.push(session.user.id);
    const query = `UPDATE auth_users SET ${setClauses.join(", ")} WHERE id = $${idx} RETURNING id, name, email, image, avatar`;
    const rows = await sql(query, values);

    return Response.json(rows[0]);
  } catch (error) {
    console.error("PUT /api/profile error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
