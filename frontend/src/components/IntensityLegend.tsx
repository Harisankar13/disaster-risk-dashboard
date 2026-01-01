"use client";

import { useMemo, useState } from "react";

type LegendItem = {
    label: string;
    count?: number;
};

type Props = {
    title?: string;
    items?: LegendItem[]; // optional: used only for a small "Plotted:" summary line
    note?: string;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
};

export default function IntensityLegend({
                                            title = "Intensity Map",
                                            items = [],
                                            note = "Colors show relative event concentration (weighted by severity score), not impact.",
                                            collapsible = true,
                                            defaultCollapsed = false,
                                        }: Props) {
    const [collapsed, setCollapsed] = useState(defaultCollapsed);

    const summary = useMemo(() => {
        const pairs = (items ?? [])
            .filter((x) => typeof x.count === "number")
            .map((x) => `${x.label}: ${x.count}`);
        return pairs.join(" • ");
    }, [items]);

    return (
        <div className="leaflet-bottom leaflet-left">
            <div className="leaflet-control m-3">
                <div className="w-[320px] rounded-2xl border border-black/10 bg-white/95 p-4 shadow-xl">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold text-zinc-900">{title}</div>

                        {collapsible && (
                            <button
                                type="button"
                                onClick={() => setCollapsed((v) => !v)}
                                className="rounded-md px-2 py-1 text-xs text-zinc-600 hover:bg-black/5"
                                aria-label={collapsed ? "Expand legend" : "Collapse legend"}
                                title={collapsed ? "Expand" : "Collapse"}
                            >
                                {collapsed ? "+" : "–"}
                            </button>
                        )}
                    </div>

                    {!collapsed ? (
                        <div className="mt-3 space-y-3">
                            {/* Color meaning */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-xs text-zinc-800">
                                    <span className="inline-block h-3 w-3 rounded-sm bg-red-500" />
                                    <span className="font-medium">High concentration</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-800">
                                    <span className="inline-block h-3 w-3 rounded-sm bg-yellow-400" />
                                    <span className="font-medium">Medium concentration</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs text-zinc-800">
                                    <span className="inline-block h-3 w-3 rounded-sm bg-blue-500" />
                                    <span className="font-medium">Low concentration</span>
                                </div>
                            </div>

                            {/* Note */}
                            <div className="text-xs leading-snug text-zinc-500">{note}</div>

                            {/* Optional small summary line (remove this block if you don't want counts at all) */}
                            {summary ? (
                                <div className="text-[11px] text-zinc-500">
                                    Plotted: <span className="text-zinc-700">{summary}</span>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="mt-2 text-xs text-zinc-600">High / Medium / Low concentration</div>
                    )}
                </div>
            </div>
        </div>
    );
}
