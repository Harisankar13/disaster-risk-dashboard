export type SeverityLevel = "low" | "medium" | "high" | "critical";
export type HazardType = "earthquake" | "flood";

export type EventItem = {
    source: string;
    event_type: "earthquake" | "flood";
    source_event_id: string;
    time_utc: string;
    place?: string | null;

    // earthquakes
    magnitude?: number | null;
    depth_km?: number | null;

    // coordinates
    lat?: number | null;
    lon?: number | null;

    // scoring
    severity_score?: number | null;
    severity_level: SeverityLevel;

    url?: string | null;

    // optional extra info (flood subtype etc.)
    hazard_subtype?: string | null;
};

export type EventsResponse = {
    hazard?: HazardType;
    count: number;
    events: EventItem[];
};

type FetchEventsParams = {
    hazard?: HazardType; // NEW
    feed?: string; // earthquakes only (USGS)
    limit?: number;
    min_magnitude?: number;
    since_hours?: number;
    min_severity_level?: SeverityLevel;
};

const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export async function fetchEvents(params: FetchEventsParams = {}): Promise<EventsResponse> {
    const q = new URLSearchParams();

    // hazard (default earthquake)
    q.set("hazard", params.hazard ?? "earthquake");

    // EQ-only params
    if (params.feed) q.set("feed", params.feed);
    if (params.min_magnitude !== undefined && params.min_magnitude !== null) {
        q.set("min_magnitude", String(params.min_magnitude));
    }

    // shared params
    if (params.limit !== undefined && params.limit !== null) q.set("limit", String(params.limit));
    if (params.since_hours !== undefined && params.since_hours !== null) q.set("since_hours", String(params.since_hours));
    if (params.min_severity_level) q.set("min_severity_level", params.min_severity_level);

    const url = `${API_BASE}/events?${q.toString()}`;

    const resp = await fetch(url, { cache: "no-store" });
    if (!resp.ok) {
        const txt = await resp.text().catch(() => "");
        throw new Error(`API ${resp.status}: ${txt || "Failed to fetch"}`);
    }

    return resp.json();
}
