import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { resolution_id, steps } = await request.json();

    if (!resolution_id || !Array.isArray(steps) || steps.length === 0) {
      return Response.json({ error: "resolution_id and steps array required" }, { status: 400 });
    }

    const [resolution] = await sql`
      SELECT id, user_id FROM resolutions WHERE id = ${resolution_id}
    `;

    if (!resolution || String(resolution.user_id) !== String(session.user.id)) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    await sql`DELETE FROM steps WHERE resolution_id = ${resolution_id}`;

    const saved = [];
    for (let i = 0; i < steps.length; i++) {
      const { title, description } = steps[i];
      const [row] = await sql`
        INSERT INTO steps (resolution_id, step_number, title, description)
        VALUES (${resolution_id}, ${i + 1}, ${title || ""}, ${description || ""})
        RETURNING *
      `;
      saved.push(row);
    }

    return Response.json({ success: true, steps: saved });
  } catch (error) {
    console.error("POST /api/steps error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
