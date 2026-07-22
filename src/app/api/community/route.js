import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

async function ensureBoostsTable() {
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

export async function GET() {
  try {
    await ensureBoostsTable();
    const session = await auth();
    const userId = session?.user?.id ?? null;

    const publicResolutions = await sql`
      SELECT r.*, u.name as user_name, u.image as user_image,
        (SELECT COUNT(*) FROM steps s WHERE s.resolution_id = r.id) as total_steps,
        (SELECT COUNT(*) FROM steps s WHERE s.resolution_id = r.id AND s.is_completed = true) as completed_steps,
        (SELECT COALESCE(SUM(c.progress_value), 0) FROM checkins c WHERE c.resolution_id = r.id) as total_progress,
        (SELECT COUNT(*) FROM cheers c WHERE c.resolution_id = r.id) as cheer_count,
        (SELECT COUNT(*) FROM boosts b WHERE b.resolution_id = r.id) as boost_count,
        (SELECT EXISTS(SELECT 1 FROM cheers c2 WHERE c2.resolution_id = r.id AND c2.from_user_id = ${userId})) as user_cheered
      FROM resolutions r
      JOIN auth_users u ON r.user_id = u.id::text
      WHERE r.is_public = true
      ORDER BY r.created_at DESC
      LIMIT 50
    `;

    return Response.json(publicResolutions);
  } catch (error) {
    console.error("GET /api/community error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
