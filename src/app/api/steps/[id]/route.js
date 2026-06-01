import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { is_completed } = await request.json();

    // Verify ownership via resolution
    const stepVerify = await sql`
      SELECT s.*, r.user_id 
      FROM steps s 
      JOIN resolutions r ON s.resolution_id = r.id 
      WHERE s.id = ${id}
    `;

    if (stepVerify.length === 0 || stepVerify[0].user_id !== session.user.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const completed_at = is_completed ? new Date() : null;

    const result = await sql`
      UPDATE steps 
      SET is_completed = ${is_completed}, completed_at = ${completed_at}
      WHERE id = ${id}
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("PUT /api/steps/[id] error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
