import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function PATCH(request, { params }) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { status } = await request.json();

    if (!["accepted", "declined"].includes(status)) {
      return Response.json({ error: "Invalid status" }, { status: 400 });
    }

    const result = await sql`
      UPDATE team_invites
      SET status = ${status}
      WHERE id = ${params.id} AND to_user_id = ${session.user.id}
      RETURNING *
    `;

    if (result.length === 0) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }

    return Response.json(result[0]);
  } catch (error) {
    console.error("PATCH /api/team-invites/[id] error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
