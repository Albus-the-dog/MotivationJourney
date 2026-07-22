import sql from "@/app/api/utils/sql";
import { auth } from "@/auth";

export async function POST(request, { params }) {
  try {
    const resolutionId = parseInt(params.id, 10);
    if (Number.isNaN(resolutionId)) {
      return Response.json({ error: "Invalid resolution id" }, { status: 400 });
    }

    const session = await auth();
    if (!session || !session.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolutionResult = await sql`
      SELECT * FROM resolutions
      WHERE id = ${resolutionId} AND user_id::text = ${String(session.user.id)}
    `;

    if (resolutionResult.length === 0) {
      return Response.json({ error: "Resolution not found" }, { status: 404 });
    }

    const resolution = resolutionResult[0];

    const measurableGoal =
      resolution.target_number && resolution.target_unit
        ? String(resolution.target_number) + " " + resolution.target_unit
        : null;

    const measurableRule = measurableGoal
      ? "- The user has set a measurable goal of exactly " +
        measurableGoal +
        ". The 6 steps MUST collectively cover ALL " +
        measurableGoal +
        " — distribute them evenly and concretely. Do NOT reference less than the full amount."
      : "- Pay close attention to every number and quantity in the resolution title and description. Spread the full goal across all 6 steps.";

    const lines = [
      "The user's resolution is: \"" + resolution.title + '"',
      'Their description: "' +
        (resolution.description || "No description provided") +
        '"',
      'Target date: "' + (resolution.target_date || "Not specified") + '"',
      measurableGoal ? "Measurable target: " + measurableGoal : "",
      "",
      "Generate exactly 6 specific, actionable steps to help them fully achieve this goal.",
      "",
      "CRITICAL RULES:",
      measurableRule,
      "- Spread the entire goal across all 6 steps logically from start to finish.",
      "- Reference the actual numbers and targets in each step — be concrete, not generic.",
      "- Steps must be in chronological order.",
      "",
      "Return ONLY a valid JSON array of exactly 6 objects. Each object must have:",
      "- step_number: integer 1 to 6",
      "- title: short specific title (max 10 words)",
      "- description: exactly 2 sentences describing what to do, referencing the specific goal details",
      "",
      "No markdown, no explanation, no extra text — just the raw JSON array.",
    ]
      .filter((l) => l !== null)
      .join("\n");

    const prompt = lines;

    const aiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_CREATE_APP_URL}/integrations/google-gemini-2-5-flash/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.ANYTHING_PROJECT_TOKEN
            ? { Authorization: `Bearer ${process.env.ANYTHING_PROJECT_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: prompt }],
        }),
      },
    );

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI integration error:", errText);
      throw new Error("AI generation failed");
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices[0].message.content;

    // Clean up AI response - remove markdown code fences
    let jsonString = content.trim();
    jsonString = jsonString.split("```json").join("");
    jsonString = jsonString.split("```").join("");
    jsonString = jsonString.trim();

    // Extract only the JSON array by finding first '[' and last ']'
    // This strips out any trailing text fragments the AI might add
    const firstBracket = jsonString.indexOf("[");
    const lastBracket = jsonString.lastIndexOf("]");

    if (
      firstBracket !== -1 &&
      lastBracket !== -1 &&
      lastBracket > firstBracket
    ) {
      jsonString = jsonString.substring(firstBracket, lastBracket + 1);
    }

    let steps;
    try {
      steps = JSON.parse(jsonString);
    } catch (e) {
      console.error("Failed to parse AI response as JSON:", jsonString);
      console.error("Parse error:", e.message);
      throw new Error("AI returned invalid JSON");
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      throw new Error("AI returned an unexpected steps format");
    }

    // Validate and filter steps to ensure each has required fields
    const validSteps = steps.filter(
      (step) =>
        step.step_number &&
        step.title &&
        step.description &&
        typeof step.step_number === "number" &&
        typeof step.title === "string" &&
        typeof step.description === "string",
    );

    if (validSteps.length === 0) {
      throw new Error("No valid steps found in AI response");
    }

    await sql`DELETE FROM steps WHERE resolution_id = ${resolutionId}`;

    for (const step of validSteps) {
      await sql`
        INSERT INTO steps (resolution_id, step_number, title, description)
        VALUES (${resolutionId}, ${step.step_number}, ${step.title}, ${step.description})
      `;
    }

    const savedSteps = await sql`
      SELECT * FROM steps WHERE resolution_id = ${resolutionId} ORDER BY step_number ASC
    `;

    return Response.json({ success: true, steps: savedSteps });
  } catch (error) {
    console.error("POST /api/resolutions/[id]/generate-steps error:", error);
    return Response.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
