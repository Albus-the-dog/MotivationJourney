import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    let teams;
    if (category) {
      teams = await sql`
        SELECT t.*,
          u.name as creator_name, u.image as creator_image, u.avatar as creator_avatar,
          (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
        FROM teams t
        JOIN auth_users u ON u.id::text = t.created_by
        WHERE t.is_public = true AND LOWER(t.goal_category) = LOWER(${category})
        ORDER BY t.created_at DESC
      `;
    } else {
      teams = await sql`
        SELECT t.*,
          u.name as creator_name, u.image as creator_image, u.avatar as creator_avatar,
          (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
        FROM teams t
        JOIN auth_users u ON u.id::text = t.created_by
        WHERE t.is_public = true
        ORDER BY t.created_at DESC
        LIMIT 30
      `;
    }
    return Response.json(teams);
  } catch (error) {
    console.error("GET /api/teams error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, goal_category, goal_title, is_public } =
      await request.json();

    if (!name) {
      return Response.json({ error: "Team name is required" }, { status: 400 });
    }

    const [team] = await sql`
      INSERT INTO teams (name, description, goal_category, goal_title, is_public, created_by)
      VALUES (${name}, ${description || null}, ${goal_category || null}, ${goal_title || null}, ${is_public !== false}, ${session.user.id})
      RETURNING *
    `;

    // Auto-join as first member
    await sql`
      INSERT INTO team_members (team_id, user_id)
      VALUES (${team.id}, ${session.user.id})
      ON CONFLICT (team_id, user_id) DO NOTHING
    `;

    return Response.json(team, { status: 201 });
  } catch (error) {
    console.error("POST /api/teams error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
