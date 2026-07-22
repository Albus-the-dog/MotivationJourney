import sql from "@/app/api/utils/sql";

export async function GET() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS resolutions (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        category TEXT DEFAULT 'general',
        target_date DATE,
        is_public BOOLEAN DEFAULT FALSE,
        target_number INTEGER,
        target_unit TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS steps (
        id SERIAL PRIMARY KEY,
        resolution_id INTEGER REFERENCES resolutions(id) ON DELETE CASCADE,
        step_number INTEGER,
        title TEXT,
        description TEXT,
        is_completed BOOLEAN DEFAULT FALSE,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS checkins (
        id SERIAL PRIMARY KEY,
        resolution_id INTEGER REFERENCES resolutions(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        note TEXT,
        mood_emoji TEXT,
        progress_value INTEGER DEFAULT 1,
        photo_url TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS cheers (
        id SERIAL PRIMARY KEY,
        resolution_id INTEGER REFERENCES resolutions(id) ON DELETE CASCADE,
        from_user_id TEXT NOT NULL,
        message TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS checkin_comments (
        id SERIAL PRIMARY KEY,
        checkin_id INTEGER REFERENCES checkins(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        comment TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    return Response.json({ ok: true, message: "All tables created successfully" });
  } catch (error) {
    console.error("Setup error:", error);
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}
