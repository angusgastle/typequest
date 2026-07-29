"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NavBar } from "@/components/NavBar";
import { BackgroundBlobs } from "@/components/BackgroundBlobs";
import { getSession, getLeaderboard } from "@/lib/data";
import type { LeaderboardRow, Session } from "@/lib/types";
import { avatarFor } from "@/lib/utils";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const [scope, setScope] = useState<"week" | "all">("week");
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    setSession(getSession());
    refresh();
  }, []);

  useEffect(() => {
    refresh();
  }, [scope]);

  async function refresh() {
    setLoading(true);
    try {
      setRows(await getLeaderboard(scope));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <NavBar />
      <BackgroundBlobs />
      <main className="mx-auto max-w-3xl px-4 py-6">
        <motion.h1
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center font-display text-4xl md:text-5xl font-extrabold"
        >
          🏆 Leaderboard
        </motion.h1>

        {/* Toggle */}
        <div className="mt-6 mx-auto flex w-fit rounded-full bg-white/70 border-2 border-white p-1">
          {(["week", "all"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`rounded-full px-5 py-2 font-display font-bold transition-colors ${
                scope === s ? "bg-coral text-white" : "text-ink/60"
              }`}
            >
              {s === "week" ? "This Week" : "All Time"}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid place-items-center py-20 font-display text-grape">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                className="text-4xl"
              >
                ⏳
              </motion.div>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-2">
              <AnimatePresence>
                {rows.map((row, i) => {
                  const isYou = session && row.first_name === session.name;
                  return (
                    <motion.div
                      key={row.kid_id + i}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className={`flex items-center gap-3 rounded-2xl border-2 p-3 ${
                        isYou
                          ? "bg-coral/10 border-coral/40"
                          : "bg-white/70 border-white"
                      }`}
                    >
                      <div className="w-8 text-center font-display font-extrabold text-lg">
                        {i < 3 ? MEDALS[i] : `#${i + 1}`}
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-cream text-2xl">
                        {row.avatar || avatarFor(row.first_name)}
                      </div>
                      <div className="flex-1 font-display font-bold">
                        {row.nickname}{" "}
                        {isYou && (
                          <span className="text-xs align-middle bg-sunny/50 rounded-full px-2 py-0.5">
                            you
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-display font-extrabold text-teal">
                          {row.wpm}{" "}
                          <span className="text-xs font-bold text-ink/50">
                            WPM
                          </span>
                        </div>
                        <div className="text-xs text-ink/50 font-display">
                          {row.accuracy}% acc · ⭐ {row.score.toLocaleString()}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="text-5xl mb-3">🌟</div>
      <p className="font-display text-xl font-bold text-grape">
        No adventurers yet!
      </p>
      <p className="font-display text-ink/50">
        Be the first to complete an adventure and claim the top spot.
      </p>
    </div>
  );
}
