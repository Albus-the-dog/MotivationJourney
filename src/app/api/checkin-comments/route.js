import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkinId = searchParams.get("checkin_id");
    if (!checkinId) {
      return Response.json({ error: "checkin_id required" }, { status: 400 });
    }

    const comments = await sql`
      SELECT cc.*, u.name as user_name, u.image as user_image, u.avatar as user_avatar
      FROM checkin_comments cc
      JOIN auth_users u ON u.id::text = cc.user_id
      WHERE cc.checkin_id = ${checkinId}
      ORDER BY cc.created_at ASC
    `;
    return Response.json(comments);
  } catch (error) {
    console.error("GET /api/checkin-comments error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { checkin_id, comment } = await request.json();
    if (!checkin_id || !comment?.trim()) {
      return Response.json(
        { error: "checkin_id and comment required" },
        { status: 400 },
      );
    }

    // Verify the checkin is public
    const [checkin] =
      await sql`SELECT id, is_public FROM checkins WHERE id = ${checkin_id}`;
    if (!checkin)
      return Response.json({ error: "Checkin not found" }, { status: 404 });
    if (!checkin.is_public)
      return Response.json(
        { error: "Cannot comment on private checkin" },
        { status: 403 },
      );

    const [newComment] = await sql`
      INSERT INTO checkin_comments (checkin_id, user_id, comment)
      VALUES (${checkin_id}, ${session.user.id}, ${comment.trim()})
      RETURNING *
    `;

    const [withUser] = await sql`
      SELECT cc.*, u.name as user_name, u.image as user_image, u.avatar as user_avatar
      FROM checkin_comments cc
      JOIN auth_users u ON u.id::text = cc.user_id
      WHERE cc.id = ${newComment.id}
    `;

    return Response.json(withUser, { status: 201 });
  } catch (error) {
    console.error("POST /api/checkin-comments error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
