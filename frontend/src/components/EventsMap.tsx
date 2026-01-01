"use client";

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, Marker, useMap } from "react-leaflet";
import type { Map as LeafletMap } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import HeatLayer from "@/components/HeatLayer";
import IntensityLegend from "@/components/IntensityLegend";
import type { EventItem } from "@/lib/api";

type Props = {
    events: EventItem[];
};

type ViewMode = "events" | "heatmap";

const DEFAULT_CENTER: [number, number] = [20, 0];
const DEFAULT_ZOOM = 2;

function colorForLevel(level?: EventItem["severity_level"]) {
    switch (level) {
        case "critical":
            return "#ef4444";
        case "high":
            return "#f97316";
        case "medium":
            return "#eab308";
        default:
            return "#22c55e";
    }
}

function makeTriangleIcon(color: string) {
    const svg = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="${color}" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3L22 21H2L12 3Z" stroke="rgba(0,0,0,0.35)" stroke-width="1"/>
    </svg>
  `.trim();

    return L.divIcon({
        html: svg,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 9],
    });
}

/**
 * Child component to safely access the Leaflet map instance (useMap)
 * without relying on MapContainer event typings.
 */
function MapControls({ onMapReady }: { onMapReady: (map: LeafletMap) => void }) {
    const map = useMap();

    // Called once when this component mounts (map exists)
    // We also invalidate size to fix partial cut / layout issues.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useMemo(() => {
        onMapReady(map);
        setTimeout(() => map.invalidateSize(), 80);
        return null;
    }, []);

    return null;
}

function ResetButton() {
    const map = useMap();
    return (
        <button
            type="button"
            onClick={() => map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)}
            className="rounded-lg border border-white/15 bg-black/60 px-3 py-1.5 text-xs text-white hover:bg-black/75"
            title="Reset view"
        >
            Reset
        </button>
    );
}

export default function EventsMap({ events }: Props) {
    const [view, setView] = useState<ViewMode>("events");
    const [mapReady, setMapReady] = useState(false);

    const validEvents = useMemo(
        () =>
            (events ?? []).filter(
                (e): e is EventItem & { lat: number; lon: number } =>
                    typeof e.lat === "number" &&
                    typeof e.lon === "number" &&
                    !Number.isNaN(e.lat) &&
                    !Number.isNaN(e.lon)
            ),
        [events]
    );

    const heatPoints = useMemo(
        () =>
            validEvents.map((e) => ({
                lat: e.lat,
                lon: e.lon,
                intensity: e.severity_score ?? 1,
            })),
        [validEvents]
    );

    const counts = useMemo(() => {
        const eq = validEvents.filter((e) => e.event_type === "earthquake").length;
        const fl = validEvents.filter((e) => e.event_type === "flood").length;
        return { eq, fl };
    }, [validEvents]);

    return (
        <div className="space-y-2">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
                <div>
                    <div className="text-sm font-semibold text-zinc-200">Events</div>
                    <div className="text-xs text-zinc-400">Exact events or intensity heatmap</div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="inline-flex overflow-hidden rounded-xl border border-white/10 bg-black/30">
                        <button
                            type="button"
                            onClick={() => setView("events")}
                            className={`px-3 py-1.5 text-xs ${
                                view === "events" ? "bg-white text-black" : "text-zinc-200 hover:bg-white/5"
                            }`}
                        >
                            Events
                        </button>
                        <button
                            type="button"
                            onClick={() => setView("heatmap")}
                            className={`px-3 py-1.5 text-xs ${
                                view === "heatmap" ? "bg-white text-black" : "text-zinc-200 hover:bg-white/5"
                            }`}
                        >
                            Heatmap
                        </button>
                    </div>
                </div>
            </div>

            {/* MAP */}
            <div className="relative h-[520px] w-full overflow-hidden rounded-2xl border border-white/10">
                <MapContainer
                    center={DEFAULT_CENTER}
                    zoom={DEFAULT_ZOOM}
                    minZoom={2}
                    worldCopyJump
                    scrollWheelZoom
                    className="h-full w-full"
                    whenReady={() => {
                        // typings expect () => void
                        setMapReady(true);
                    }}
                >
                    {/* Access map instance safely */}
                    {mapReady && (
                        <MapControls
                            onMapReady={() => {
                                // we don't need to store it globally here;
                                // MapControls already invalidates size.
                            }}
                        />
                    )}

                    <TileLayer
                        attribution="&copy; OpenStreetMap"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        noWrap
                    />

                    {/* Reset button overlay */}
                    <div className="leaflet-top leaflet-right">
                        <div className="leaflet-control m-2">
                            <ResetButton />
                        </div>
                    </div>

                    {/* Heatmap */}
                    {view === "heatmap" && (
                        <>
                            <HeatLayer points={heatPoints} />
                            <IntensityLegend
                                title="Events — Intensity"
                                items={[
                                    { label: "Earthquakes", count: counts.eq },
                                    { label: "Floods", count: counts.fl },
                                ]}
                                note="Colors indicate relative concentration weighted by severity score."
                            />
                        </>
                    )}

                    {/* Events */}
                    {view === "events" &&
                        validEvents.map((e) => {
                            const col = colorForLevel(e.severity_level);

                            if (e.event_type === "earthquake") {
                                return (
                                    <CircleMarker
                                        key={`${e.source}-${e.source_event_id}`}
                                        center={[e.lat, e.lon]}
                                        radius={6}
                                        pathOptions={{
                                            color: col,
                                            fillColor: col,
                                            fillOpacity: 0.9,
                                            weight: 1,
                                        }}
                                    >
                                        <Popup>
                                            <strong>{e.place ?? "Unknown"}</strong>
                                            <br />
                                            Magnitude: {e.magnitude ?? "?"}
                                            <br />
                                            Depth: {e.depth_km ?? "?"} km
                                            <br />
                                            Severity: {(e.severity_level ?? "low").toUpperCase()}
                                        </Popup>
                                    </CircleMarker>
                                );
                            }

                            return (
                                <Marker
                                    key={`${e.source}-${e.source_event_id}`}
                                    position={[e.lat, e.lon]}
                                    icon={makeTriangleIcon(col)}
                                >
                                    <Popup>
                                        <strong>{e.place ?? "Unknown"}</strong>
                                        <br />
                                        Type: {e.hazard_subtype ?? "Flood alert"}
                                        <br />
                                        Severity: {(e.severity_level ?? "low").toUpperCase()}
                                    </Popup>
                                </Marker>
                            );
                        })}
                </MapContainer>
            </div>
        </div>
    );
}
