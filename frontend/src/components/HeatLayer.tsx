"use client";

import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.heat";

export type HeatPoint = {
    lat: number;
    lon: number;
    intensity?: number;
};

type Props = {
    points: HeatPoint[];
};

export default function HeatLayer({ points }: Props) {
    const map = useMap();

    useEffect(() => {
        if (!map || points.length === 0) return;

        // ✅ Explicit tuple typing — this is the key fix
        const heatPoints: [number, number, number?][] = points
            .filter(
                (p): p is Required<Pick<HeatPoint, "lat" | "lon">> & HeatPoint =>
                    typeof p.lat === "number" &&
                    typeof p.lon === "number" &&
                    !Number.isNaN(p.lat) &&
                    !Number.isNaN(p.lon)
            )
            .map((p): [number, number, number?] => [
                p.lat,
                p.lon,
                p.intensity ?? 1,
            ]);

        const layer = L.heatLayer(heatPoints, {
            radius: 25,
            blur: 15,
            maxZoom: 6,
        });

        layer.addTo(map);

        return () => {
            map.removeLayer(layer);
        };
    }, [map, points]);

    return null;
}
