import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request, { params }) {
  try {
    const resolutionId = parseInt(params.id, 10);
    if (Number.isNaN(resolutionId)) {
      return Response.json({ error: "Invalid resolution id" }, { status: 400 });
    }
    const session = await auth();

    // Cast user_id to int in the JOIN since auth_users.id is integer
    const resolutionResult = await sql`
      SELECT r.*, u.name as user_name, u.image as user_image,
        COALESCE((SELECT SUM(c.progress_value) FROM checkins c WHERE c.resolution_id = r.id), 0) as total_progress
      FROM resolutions r
      LEFT JOIN auth_users u ON u.id::text = r.user_id
      WHERE r.id = ${resolutionId}
    `;

    if (resolutionResult.length === 0) {
      return Response.json({ error: "Resolution not found" }, { status: 404 });
    }

    const resolution = resolutionResult[0];

    if (!resolution.is_public) {
      if (!session?.user?.id) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      if (String(resolution.user_id) !== String(session.user.id)) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const steps = await sql`
      SELECT * FROM steps 
      WHERE resolution_id = ${resolutionId} 
      ORDER BY step_number ASC
    `;

    const cheers = await sql`
      SELECT c.*, u.name as from_user_name, u.image as from_user_image
      FROM cheers c
      LEFT JOIN auth_users u ON u.id::text = c.from_user_id
      WHERE c.resolution_id = ${resolutionId}
      ORDER BY c.created_at DESC
    `;

    return Response.json({ ...resolution, steps, cheers });
  } catch (error) {
    console.error("GET /api/resolutions/[id] error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const resolutionId = parseInt(params.id, 10);
    if (Number.isNaN(resolutionId)) {
      return Response.json({ error: "Invalid resolution id" }, { status: 400 });
    }
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await sql`SELECT * FROM resolutions WHERE id = ${resolutionId}`;
    if (existing.length === 0 || String(existing[0].user_id) !== String(session.user.id)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ageMs = Date.now() - new Date(existing[0].created_at).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) {
      return Response.json({ error: "Goals can only be deleted within 24 hours of creation" }, { status: 403 });
    }

    await sql`DELETE FROM cheers WHERE resolution_id = ${resolutionId}`;
    await sql`DELETE FROM checkins WHERE resolution_id = ${resolutionId}`;
    await sql`DELETE FROM steps WHERE resolution_id = ${resolutionId}`;
    await sql`DELETE FROM boosts WHERE resolution_id = ${resolutionId}`;
    await sql`DELETE FROM team_invites WHERE resolution_id = ${resolutionId}`;
    await sql`DELETE FROM resolutions WHERE id = ${resolutionId}`;

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/resolutions/[id] error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const resolutionId = parseInt(params.id, 10);
    if (Number.isNaN(resolutionId)) {
      return Response.json({ error: "Invalid resolution id" }, { status: 400 });
    }
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const existing =
      await sql`SELECT * FROM resolutions WHERE id = ${resolutionId}`;
    if (
      existing.length === 0 ||
      String(existing[0].user_id) !== String(session.user.id)
    ) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const current = existing[0];

    const title = body.title !== undefined ? body.title : current.title;
    const description =
      body.description !== undefined ? body.description : current.description;
    const category =
      body.category !== undefined ? body.category : current.category;
    const target_date =
      body.target_date !== undefined ? body.target_date : current.target_date;
    const is_public =
      body.is_public !== undefined ? body.is_public : current.is_public;
    const target_number =
      body.target_number !== undefined
        ? body.target_number
        : current.target_number;
    const target_unit =
      body.target_unit !== undefined ? body.target_unit : current.target_unit;

    const result = await sql`
      UPDATE resolutions 
      SET title = ${title}, description = ${description}, category = ${category}, 
          target_date = ${target_date}, is_public = ${is_public},
          target_number = ${target_number}, target_unit = ${target_unit}
      WHERE id = ${resolutionId}
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("PUT /api/resolutions/[id] error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
