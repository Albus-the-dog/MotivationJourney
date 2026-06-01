import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    const publicResolutions = await sql`
      SELECT r.*, u.name as user_name, u.image as user_image,
        (SELECT COUNT(*) FROM steps s WHERE s.resolution_id = r.id) as total_steps,
        (SELECT COUNT(*) FROM steps s WHERE s.resolution_id = r.id AND s.is_completed = true) as completed_steps,
        (SELECT COUNT(*) FROM cheers c WHERE c.resolution_id = r.id) as cheer_count
      FROM resolutions r
      JOIN auth_users u ON r.user_id = u.id
      WHERE r.is_public = true
      ORDER BY r.created_at DESC
      LIMIT 20
    `;

    return Response.json(publicResolutions);
  } catch (error) {
    console.error("GET /api/community error:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
