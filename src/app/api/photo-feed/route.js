import sql from "@/app/api/utils/sql";

export async function GET(request) {
  try {
    const photos = await sql`
      SELECT c.id, c.note, c.photo_url, c.mood_emoji, c.created_at, c.progress_value,
        c.resolution_id,
        r.title as resolution_title, r.category,
        u.name as user_name, u.image as user_image, u.avatar as user_avatar,
        (SELECT COUNT(*) FROM checkin_comments cc WHERE cc.checkin_id = c.id) as comment_count
      FROM checkins c
      JOIN resolutions r ON r.id = c.resolution_id
      JOIN auth_users u ON u.id::text = c.user_id
      WHERE c.is_public = true AND c.photo_url IS NOT NULL
      ORDER BY c.created_at DESC
      LIMIT 30
    `;
    return Response.json(photos);
  } catch (error) {
    console.error("GET /api/photo-feed error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
