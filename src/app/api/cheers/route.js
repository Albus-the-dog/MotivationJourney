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
      VALUES (${resolution_id}, ${session.user.id}, ${message})
      RETURNING *
    `;

    return Response.json(result[0]);
  } catch (error) {
    console.error("POST /api/cheers error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
