import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const session = await auth();

    const [team] = await sql`
      SELECT t.*,
        u.name as creator_name, u.image as creator_image, u.avatar as creator_avatar,
        (SELECT COUNT(*) FROM team_members tm WHERE tm.team_id = t.id) as member_count
      FROM teams t
      JOIN auth_users u ON u.id::text = t.created_by
      WHERE t.id = ${id}
    `;

    if (!team)
      return Response.json({ error: "Team not found" }, { status: 404 });
    if (!team.is_public && team.created_by !== session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const members = await sql`
      SELECT tm.joined_at, u.name, u.image, u.avatar, u.id::text as user_id
      FROM team_members tm
      JOIN auth_users u ON u.id::text = tm.user_id
      WHERE tm.team_id = ${id}
      ORDER BY tm.joined_at ASC
    `;

    const isMember = session?.user?.id
      ? members.some((m) => m.user_id === session.user.id)
      : false;

    return Response.json({ ...team, members, isMember });
  } catch (error) {
    console.error("GET /api/teams/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const action = body.action; // "join" or "leave"

    const [team] = await sql`SELECT id, is_public FROM teams WHERE id = ${id}`;
    if (!team)
      return Response.json({ error: "Team not found" }, { status: 404 });

    if (action === "leave") {
      await sql`
        DELETE FROM team_members WHERE team_id = ${id} AND user_id = ${session.user.id}
      `;
      return Response.json({ success: true, action: "left" });
    }

    // join
    await sql`
      INSERT INTO team_members (team_id, user_id)
      VALUES (${id}, ${session.user.id})
      ON CONFLICT (team_id, user_id) DO NOTHING
    `;
    return Response.json({ success: true, action: "joined" });
  } catch (error) {
    console.error("POST /api/teams/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
