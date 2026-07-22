import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export default function ResolutionsRoute() { return null; }

export async function loader({ request }) {
  try {
    const session = await auth(request);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const resolutions = await sql`
      SELECT r.*,
        (SELECT COUNT(*) FROM steps s WHERE s.resolution_id = r.id) as total_steps,
        (SELECT COUNT(*) FROM steps s WHERE s.resolution_id = r.id AND s.is_completed = true) as completed_steps,
        (SELECT COALESCE(SUM(c.progress_value), 0) FROM checkins c WHERE c.resolution_id = r.id) as total_progress
      FROM resolutions r
      WHERE r.user_id = ${session.user.id}
      ORDER BY r.created_at DESC
    `;
    return Response.json(resolutions);
  } catch (error) {
    console.error("GET /api/resolutions error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function action({ request }) {
  try {
    const session = await auth(request);
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { title, description, category, target_date, is_public, target_number, target_unit } =
      await request.json();
    if (!title) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }
    const result = await sql`
      INSERT INTO resolutions (user_id, title, description, category, target_date, is_public, target_number, target_unit)
      VALUES (
        ${session.user.id},
        ${title || null},
        ${description || null},
        ${category || null},
        ${target_date || null},
        ${is_public || false},
        ${target_number || null},
        ${target_unit || null}
      )
      RETURNING *
    `;
    return Response.json(result[0]);
  } catch (error) {
    console.error("POST /api/resolutions error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
