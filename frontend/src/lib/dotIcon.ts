import L from "leaflet";

/**
 * Returns a small, clean dot marker.
 */
export function makeDotIcon(color: string, size = 12) {
    return L.divIcon({
        className: "eq-dot-icon",
        html: `<div style="
      width:${size}px;
      height:${size}px;
      border-radius:50%;
      background:${color};
      box-shadow:0 0 4px rgba(0,0,0,0.3);
    "></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
    });
}