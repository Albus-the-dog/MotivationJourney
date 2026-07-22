import { auth } from "@/auth";
import sql from "@/app/api/utils/sql";

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = params;
    const { note } = await request.json();

    const [checkin] = await sql`
      SELECT c.id, c.user_id FROM checkins c WHERE c.id = ${id}
    `;

    if (!checkin || String(checkin.user_id) !== String(session.user.id)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const [updated] = await sql`
      UPDATE checkins SET note = ${note ?? ""} WHERE id = ${id} RETURNING *
    `;

    return Response.json(updated);
  } catch (error) {
    console.error("PATCH /api/checkins/[id] error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
