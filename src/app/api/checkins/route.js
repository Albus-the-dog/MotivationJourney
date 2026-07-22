import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const session = await auth();
    const { searchParams } = new URL(request.url);
    const resolutionId = searchParams.get("resolution_id");

    if (!resolutionId) {
      return Response.json(
        { error: "resolution_id is required" },
        { status: 400 },
      );
    }

    // Verify the user owns this resolution (or it's public)
    const [resolution] = await sql`
      SELECT id, user_id, is_public FROM resolutions WHERE id = ${resolutionId}
    `;

    if (!resolution) {
      return Response.json({ error: "Resolution not found" }, { status: 404 });
    }

    const isOwner = session?.user?.id === String(resolution.user_id);
    if (!resolution.is_public && !isOwner) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const checkins = await sql`
      SELECT
        c.id, c.resolution_id, c.user_id, c.note, c.mood_emoji, c.created_at,
        c.progress_value, c.photo_url, c.is_public,
        u.name as user_name, u.image as user_image
      FROM checkins c
      LEFT JOIN auth_users u ON u.id::text = c.user_id
      WHERE c.resolution_id = ${resolutionId}
      ORDER BY c.created_at DESC
    `;

    return Response.json(checkins);
  } catch (error) {
    console.error("GET /api/checkins error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      resolution_id,
      note,
      mood_emoji,
      progress_value,
      photo_url,
      is_public,
    } = await request.json();

    if (!resolution_id) {
      return Response.json(
        { error: "resolution_id is required" },
        { status: 400 },
      );
    }

    // Verify the user owns this resolution
    const [resolution] = await sql`
      SELECT id, user_id FROM resolutions WHERE id = ${resolution_id}
    `;

    if (!resolution) {
      return Response.json({ error: "Resolution not found" }, { status: 404 });
    }

    if (String(resolution.user_id) !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [checkin] = await sql`
      INSERT INTO checkins (resolution_id, user_id, note, mood_emoji, progress_value, photo_url, is_public)
      VALUES (${resolution_id}, ${session.user.id}, ${note || null}, ${mood_emoji || null}, ${progress_value ?? 1}, ${photo_url || null}, ${is_public || false})
      RETURNING *
    `;

    return Response.json(checkin, { status: 201 });
  } catch (error) {
    console.error("POST /api/checkins error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
