"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { fetchEvents, type EventItem, type SeverityLevel } from "@/lib/api";

const EventsMap = dynamic(() => import("@/components/EventsMap"), { ssr: false });

type HazardFilter = "earthquake" | "flood" | "all";

function badgeClass(level: SeverityLevel) {
  switch (level) {
    case "critical":
      return "bg-red-600 text-white";
    case "high":
      return "bg-orange-600 text-white";
    case "medium":
      return "bg-yellow-500 text-black";
    default:
      return "bg-green-600 text-white";
  }
}

function hazardPill(e: EventItem) {
  if (e.event_type === "earthquake") return "EQ";
  if (e.event_type === "flood") return "FLOOD";
  return "EVENT";
}

export default function Home() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [hazard, setHazard] = useState<HazardFilter>("all");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const [eq, fl] = await Promise.all([
          fetchEvents({ hazard: "earthquake", feed: "all_day", limit: 80, since_hours: 24 }),
          fetchEvents({ hazard: "flood", limit: 200, since_hours: 24 }),
        ]);

        const merged = [...(eq.events ?? []), ...(fl.events ?? [])];

        merged.sort((a, b) => {
          const as = a.severity_score ?? 0;
          const bs = b.severity_score ?? 0;
          if (bs !== as) return bs - as;
          const at = a.time_utc ? Date.parse(a.time_utc) : 0;
          const bt = b.time_utc ? Date.parse(b.time_utc) : 0;
          return bt - at;
        });

        if (!cancelled) setEvents(merged);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load events");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const t = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (hazard === "all") return events;
    return events.filter((e) => e.event_type === hazard);
  }, [events, hazard]);

  return (
      <main className="min-h-screen bg-gradient-to-b from-black to-zinc-950 p-6 text-zinc-100">
        <div className="mx-auto w-full max-w-6xl space-y-5">
          <header className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight">Disaster Risk Dashboard</h1>
            <p className="text-sm text-zinc-400">Live hazard feeds — refreshed every 60 seconds</p>
          </header>

          {/* Hazard toggle */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-sm text-zinc-400">Hazard:</span>

              <button
                  onClick={() => setHazard("earthquake")}
                  className={`rounded-lg px-3 py-1.5 text-sm border ${
                      hazard === "earthquake"
                          ? "border-white/20 bg-white/10"
                          : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
              >
                Earthquakes
              </button>

              <button
                  onClick={() => setHazard("flood")}
                  className={`rounded-lg px-3 py-1.5 text-sm border ${
                      hazard === "flood"
                          ? "border-white/20 bg-white/10"
                          : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
              >
                Floods
              </button>

              <button
                  onClick={() => setHazard("all")}
                  className={`rounded-lg px-3 py-1.5 text-sm border ${
                      hazard === "all"
                          ? "border-white/20 bg-white/10"
                          : "border-white/10 bg-black/20 hover:bg-white/5"
                  }`}
              >
                All
              </button>

              <div className="ml-auto text-xs text-zinc-400">
                Showing <span className="font-medium text-zinc-200">{filteredEvents.length}</span> events
              </div>
            </div>
          </div>

          {loading && <div className="text-sm text-zinc-300">Loading…</div>}
          {error && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
          )}

          {/* Map card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <EventsMap events={filteredEvents} />
          </div>

          {/* List card */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-zinc-200">Latest events</h2>
              <div className="text-xs text-zinc-400">Sorted by severity, then time</div>
            </div>

            <div className="grid gap-3">
              {filteredEvents.map((e) => (
                  <a
                      key={`${e.source}-${e.source_event_id}`}
                      href={e.url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-2xl border border-white/10 bg-black/20 p-4 hover:bg-white/5"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-2">
                      <span className="mt-0.5 shrink-0 rounded-md border border-white/10 bg-black/40 px-2 py-0.5 text-xs text-zinc-300">
                        {hazardPill(e)}
                      </span>

                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-zinc-100 line-clamp-4">
                              {e.place ?? "Unknown location"}
                            </div>

                            <div className="mt-1 text-xs text-zinc-400">
                              {e.time_utc ? new Date(e.time_utc).toUTCString() : "Unknown time"}
                              {e.event_type === "earthquake" ? (
                                  <>
                                    {" "}
                                    • M {e.magnitude ?? "?"} • Depth {e.depth_km ?? "?"} km
                                  </>
                              ) : (
                                  <>
                                    {" "}
                                    • {e.hazard_subtype ?? "Flood alert"}
                                  </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        <span className="text-sm font-semibold tabular-nums">{e.severity_score ?? "-"}</span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${badgeClass(e.severity_level)}`}>
                      {e.severity_level.toUpperCase()}
                    </span>
                      </div>
                    </div>
                  </a>
              ))}
            </div>
          </div>
        </div>
      </main>
  );
}
