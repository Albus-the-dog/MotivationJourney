import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

async function ensureTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS boosts (
      id SERIAL PRIMARY KEY,
      resolution_id INTEGER REFERENCES resolutions(id) ON DELETE CASCADE,
      from_user_id TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
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

export async function GET() {
  try {
    await ensureTables();
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [invites, boosts, deadlineReminders, streakReminders] = await Promise.all([
      sql`
        SELECT ti.*, u.name as from_user_name, u.image as from_user_image,
          r.title as resolution_title
        FROM team_invites ti
        JOIN auth_users u ON u.id::text = ti.from_user_id
        JOIN resolutions r ON r.id = ti.resolution_id
        WHERE ti.to_user_id = ${userId} AND ti.status = 'pending'
        ORDER BY ti.created_at DESC
      `,
      sql`
        SELECT b.*, u.name as from_user_name, u.image as from_user_image,
          r.title as resolution_title, r.id as res_id
        FROM boosts b
        JOIN auth_users u ON u.id::text = b.from_user_id
        JOIN resolutions r ON r.id = b.resolution_id
        WHERE r.user_id = ${userId}
        ORDER BY b.created_at DESC
        LIMIT 50
      `,
      sql`
        SELECT r.id as resolution_id, r.title,
          CEIL(EXTRACT(EPOCH FROM (r.target_date - NOW())) / 86400)::int as days_left
        FROM resolutions r
        WHERE r.user_id = ${userId}
          AND r.reminders_enabled = true
          AND r.target_date IS NOT NULL
          AND r.target_date > NOW()
          AND r.target_date <= NOW() + INTERVAL '7 days'
        ORDER BY r.target_date ASC
      `,
      sql`
        SELECT r.id as resolution_id, r.title,
          MAX(c.created_at) as last_checkin_at,
          FLOOR(EXTRACT(EPOCH FROM (NOW() - MAX(c.created_at))) / 86400)::int as days_since
        FROM resolutions r
        JOIN checkins c ON c.resolution_id = r.id AND c.user_id = ${userId}
        WHERE r.user_id = ${userId}
          AND r.reminders_enabled = true
        GROUP BY r.id, r.title
        HAVING EXTRACT(EPOCH FROM (NOW() - MAX(c.created_at))) / 86400 > 3
        ORDER BY MAX(c.created_at) ASC
      `,
    ]);

    const reminders = [
      ...deadlineReminders.map((r) => ({ ...r, type: "deadline" })),
      ...streakReminders.map((r) => ({ ...r, type: "streak" })),
    ];

    return Response.json({ invites, boosts, reminders });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
