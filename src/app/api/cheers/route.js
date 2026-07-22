import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resolution_id, message } = await request.json();

    if (!resolution_id) {
      return Response.json(
        { error: "Resolution ID is required" },
        { status: 400 },
      );
    }

    const result = await sql`
      INSERT INTO cheers (resolution_id, from_user_id, message)
      VALUES (${resolution_id}, ${session.user.id}, ${message || ""})
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("POST /api/cheers error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const resolution_id = searchParams.get("resolution_id");

    if (!resolution_id) {
      return Response.json({ error: "Resolution ID is required" }, { status: 400 });
    }

    await sql`
      DELETE FROM cheers
      WHERE resolution_id = ${resolution_id} AND from_user_id = ${session.user.id}
    `;

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/cheers error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
