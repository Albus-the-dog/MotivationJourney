import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q || q.length < 2) {
      return Response.json([]);
    }

    const pattern = `%${q}%`;

    const users = await sql`
      SELECT id::text as id, name, email, image
      FROM auth_users
      WHERE (name ILIKE ${pattern} OR email ILIKE ${pattern})
        AND id::text != ${session.user.id}
      ORDER BY name
      LIMIT 8
    `;

    return Response.json(users);
  } catch (error) {
    console.error("GET /api/users/search error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
