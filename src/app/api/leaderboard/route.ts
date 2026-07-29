import { NextResponse } from "next/server";
import { getServerSupabase, hasSupabase } from "@/lib/supabase-server";
import { avatarFor } from "@/lib/utils";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const scope = url.searchParams.get("scope") === "all" ? "all" : "week";

  const supabase = getServerSupabase();
  if (!hasSupabase() || !supabase) {
    return NextResponse.json([]);
  }

  const since = new Date();
  if (scope === "week") {
    since.setDate(since.getDate() - 7);
  } else {
    since.setFullYear(2000);
  }

  const { data: tests, error } = await supabase
    .from("tests")
    .select("kid_id, score, errors, time_to_complete, test_content, created")
    .gte("created", since.toISOString());

  const { data: kids } = await supabase.from("kids").select("*");

  if (error) return NextResponse.json([]);

  const stats: Record<string, { score: number; wpm: number; n: number; errors: number; chars: number }> = {};
  for (const t of tests ?? []) {
    const s = (stats[t.kid_id] ||= { score: 0, wpm: 0, n: 0, errors: 0, chars: 0 });
    const chars = t.test_content?.prompt?.length ?? 0;
    s.score += t.score ?? 0;
    s.wpm += t.time_to_complete ? (chars / 5) / (t.time_to_complete / 60) : 0;
    s.errors += t.errors ?? 0;
    s.chars += chars;
    s.n += 1;
  }
  const rows = (kids ?? []).map((k) => {
    const s = stats[k.id];
    const wpm = s && s.n ? Math.round(s.wpm / s.n) : 0;
    const accuracy =
      s && s.chars ? Math.max(0, Math.round(((s.chars - s.errors) / s.chars) * 100)) : 0;
    return {
      kid_id: k.id,
      nickname: k.nickname || k.first_name,
      first_name: k.first_name,
      avatar: avatarFor(k.first_name),
      wpm,
      accuracy,
      score: s ? s.score : 0,
      rank: 0,
    };
  });
  rows.sort((a, b) => b.score - a.score);
  rows.forEach((r, i) => (r.rank = i + 1));
  return NextResponse.json(rows);
}
