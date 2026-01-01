"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
    min: number;
    max: number;
    value: [number, number];
    onChange: (v: [number, number]) => void;
    step?: number;
};

export default function MagnitudeSlider({
                                            min,
                                            max,
                                            value,
                                            onChange,
                                            step = 0.1,
                                        }: Props) {
    const [minVal, setMinVal] = useState(value[0]);
    const [maxVal, setMaxVal] = useState(value[1]);

    // keep local state in sync if parent changes
    useEffect(() => {
        setMinVal(value[0]);
        setMaxVal(value[1]);
    }, [value[0], value[1]]);

    // clamp helpers
    const clamp = (v: number) => Math.min(max, Math.max(min, v));
    const minGap = step; // at least one "step" apart

    // update parent
    useEffect(() => {
        onChange([minVal, maxVal]);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [minVal, maxVal]);

    const minPct = useMemo(() => ((minVal - min) / (max - min)) * 100, [minVal, min, max]);
    const maxPct = useMemo(() => ((maxVal - min) / (max - min)) * 100, [maxVal, min, max]);

    return (
        <div className="w-full mt-2">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>Magnitude: {minVal.toFixed(1)}</span>
                <span>{maxVal.toFixed(1)}</span>
            </div>

            <div className="relative h-8">
                {/* Track */}
                <div className="absolute top-1/2 w-full h-1 bg-gray-300 -translate-y-1/2 rounded" />

                {/* Highlighted range */}
                <div
                    className="absolute top-1/2 h-1 bg-blue-500 -translate-y-1/2 rounded"
                    style={{
                        left: `${minPct}%`,
                        width: `${Math.max(0, maxPct - minPct)}%`,
                    }}
                />

                {/* Min thumb */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={minVal}
                    onChange={(e) => {
                        const v = clamp(Number(e.target.value));
                        setMinVal(Math.min(v, maxVal - minGap));
                    }}
                    // Let this thumb be draggable even when sliders overlap
                    style={{ zIndex: minVal > max - (max - min) * 0.15 ? 6 : 4 }}
                    className="absolute top-1/2 -translate-y-1/2 w-full bg-transparent pointer-events-auto accent-blue-600"
                />

                {/* Max thumb */}
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={maxVal}
                    onChange={(e) => {
                        const v = clamp(Number(e.target.value));
                        setMaxVal(Math.max(v, minVal + minGap));
                    }}
                    // If thumbs are close, keep max thumb on top; otherwise allow both to work
                    style={{
                        zIndex: maxVal < min + (max - min) * 0.15 ? 6 : 5,
                        pointerEvents: "auto",
                    }}
                    className="absolute top-1/2 -translate-y-1/2 w-full bg-transparent pointer-events-auto accent-blue-600"
                />
            </div>
        </div>
    );
}