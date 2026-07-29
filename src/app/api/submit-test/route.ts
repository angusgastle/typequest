import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";
import type { TestContent, TestResult } from "@/lib/types";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const kidId: string = body.kidId;
  const content: TestContent = body.content;
  const result: TestResult = body.result;
  if (!kidId || !content || !result) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const supabase = getServerSupabase();
  if (!hasSupabase() || !supabase) {
    return NextResponse.json({ error: "DB not configured" }, { status: 503 });
  }

  const { error: tError } = await supabase.from("tests").insert({
    kid_id: kidId,
    test_content: content,
    difficulty: 1,
    errors: result.errors,
    score: result.score,
    time_to_complete: result.timeToComplete,
  });
  if (tError) {
    return NextResponse.json({ error: tError.message }, { status: 500 });
  }

  // Update kid aggregate stats
  const { data: kid } = await supabase
    .from("kids")
    .select("*")
    .eq("id", kidId)
    .single();
  if (kid) {
    const testsComplete = (kid.tests_complete ?? 0) + 1;
    const newWpm = Math.round(
      ((kid.wpm ?? 0) * (kid.tests_complete ?? 0) + result.wpm) /
        Math.max(1, testsComplete)
    );
    const level =
      result.accuracy >= 90 ? (kid.level ?? 1) + 1 : kid.level ?? 1;
    await supabase
      .from("kids")
      .update({
        tests_complete: testsComplete,
        wpm: newWpm,
        cumulative_score: (kid.cumulative_score ?? 0) + result.score,
        level,
        last_updated: new Date().toISOString(),
      })
      .eq("id", kidId);
  }

  return NextResponse.json({
    kid: {
      kidId,
      name: kid?.first_name,
      level: kid ? (result.accuracy >= 90 ? kid.level + 1 : kid.level) : 1,
      cumulativeScore:
        (kid?.cumulative_score ?? 0) + result.score,
    },
    rank: null,
  });
}
