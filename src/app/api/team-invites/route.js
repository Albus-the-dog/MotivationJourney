import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS team_invites (
      id SERIAL PRIMARY KEY,
      resolution_id INTEGER REFERENCES resolutions(id) ON DELETE CASCADE,
      from_user_id TEXT NOT NULL,
      to_user_id TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function POST(request) {
  try {
    await ensureTable();
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resolution_id, to_user_id } = await request.json();

    if (!resolution_id || !to_user_id) {
      return Response.json({ error: "resolution_id and to_user_id required" }, { status: 400 });
    }

    const result = await sql`
      INSERT INTO team_invites (resolution_id, from_user_id, to_user_id)
      VALUES (${resolution_id}, ${session.user.id}, ${to_user_id})
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("POST /api/team-invites error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    await ensureTable();
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invites = await sql`
      SELECT ti.*,
        u.name as from_user_name, u.image as from_user_image,
        r.title as resolution_title
      FROM team_invites ti
      JOIN auth_users u ON u.id::text = ti.from_user_id
      JOIN resolutions r ON r.id = ti.resolution_id
      WHERE ti.to_user_id = ${session.user.id} AND ti.status = 'pending'
      ORDER BY ti.created_at DESC
    `;

    return Response.json(invites);
  } catch (error) {
    console.error("GET /api/team-invites error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
