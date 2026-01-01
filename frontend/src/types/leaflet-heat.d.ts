import * as L from "leaflet";

declare module "leaflet" {
    function heatLayer(
        latlngs: Array<[number, number, number?]>,
        options?: {
            radius?: number;
            blur?: number;
            maxZoom?: number;
            minOpacity?: number;
            max?: number;
            gradient?: Record<number, string>;
        }
    ): L.Layer;
}
