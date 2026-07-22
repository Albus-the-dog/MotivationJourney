import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS boosts (
      id SERIAL PRIMARY KEY,
      resolution_id INTEGER REFERENCES resolutions(id) ON DELETE CASCADE,
      from_user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function GET(request) {
  try {
    await ensureTable();
    const { searchParams } = new URL(request.url);
    const resolution_id = searchParams.get("resolution_id");

    if (!resolution_id) {
      return Response.json({ error: "resolution_id required" }, { status: 400 });
    }

    const boosts = await sql`
      SELECT b.*, u.name as from_user_name, u.image as from_user_image
      FROM boosts b
      LEFT JOIN auth_users u ON u.id::text = b.from_user_id
      WHERE b.resolution_id = ${resolution_id}
      ORDER BY b.created_at DESC
    `;

    return Response.json(boosts);
  } catch (error) {
    console.error("GET /api/boosts error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await ensureTable();
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resolution_id, message } = await request.json();

    if (!resolution_id || !message?.trim()) {
      return Response.json({ error: "resolution_id and message required" }, { status: 400 });
    }

    const [res] = await sql`SELECT user_id FROM resolutions WHERE id = ${resolution_id}`;
    if (res && String(res.user_id) === session.user.id) {
      return Response.json({ error: "Cannot boost your own resolution" }, { status: 403 });
    }

    const result = await sql`
      INSERT INTO boosts (resolution_id, from_user_id, message)
      VALUES (${resolution_id}, ${session.user.id}, ${message.trim()})
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("POST /api/boosts error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
