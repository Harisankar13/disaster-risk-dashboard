from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import requests


# -------- NWS (US) Alerts (api.weather.gov) --------
NWS_ACTIVE_ALERTS_URL = "https://api.weather.gov/alerts/active"

NWS_FLOOD_EVENTS = [
    "Flood Warning",
    "Flood Watch",
    "Flash Flood Warning",
    "Flash Flood Watch",
    "Coastal Flood Warning",
    "Coastal Flood Watch",
    "Coastal Flood Advisory",
    "Flood Advisory",
]


def _iso_utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _centroid_of_ring(ring: List[List[float]]) -> Tuple[Optional[float], Optional[float]]:
    """
    ring: [[lon, lat], ...]
    simple average centroid (good enough for alert polygons)
    """
    if not ring:
        return None, None
    try:
        lons = [p[0] for p in ring if isinstance(p, (list, tuple)) and len(p) >= 2]
        lats = [p[1] for p in ring if isinstance(p, (list, tuple)) and len(p) >= 2]
        if not lons or not lats:
            return None, None
        return float(sum(lats) / len(lats)), float(sum(lons) / len(lons))
    except Exception:
        return None, None


def _pick_point_from_geojson(geometry: Dict[str, Any] | None) -> tuple[Optional[float], Optional[float]]:
    """
    Best-effort: NWS alerts are often polygons.
    We'll use centroid (not first vertex) to avoid many points collapsing onto same place.
    Returns (lat, lon) or (None, None).
    """
    if not geometry:
        return None, None

    gtype = geometry.get("type")
    coords = geometry.get("coordinates")
    if not coords:
        return None, None

    try:
        # Point: [lon, lat]
        if gtype == "Point":
            lon, lat = coords
            return float(lat), float(lon)

        # Polygon: [[[lon, lat], ...], ...]
        if gtype == "Polygon":
            ring = coords[0] or []
            return _centroid_of_ring(ring)

        # MultiPolygon: [[[[lon, lat], ...], ...], ...]
        if gtype == "MultiPolygon":
            ring = coords[0][0] if coords and coords[0] else []
            return _centroid_of_ring(ring)
    except Exception:
        return None, None

    return None, None


def _fetch_zone_point(headers: Dict[str, str], zone_url: str) -> tuple[Optional[float], Optional[float]]:
    """
    Fallback: if alert geometry is missing, NWS often provides affectedZones (URLs).
    We fetch the first zone and use its geometry centroid.
    """
    try:
        zr = requests.get(zone_url, headers=headers, timeout=20)
        zr.raise_for_status()
        z = zr.json()
        geom = z.get("geometry")
        lat, lon = _pick_point_from_geojson(geom)
        return lat, lon
    except Exception:
        return None, None


def _severity_level_from_nws(props: Dict[str, Any]) -> str:
    sev = (props.get("severity") or "").lower().strip()
    if sev == "extreme":
        return "critical"
    if sev == "severe":
        return "high"
    if sev == "moderate":
        return "medium"
    return "low"


def _severity_score_for_flood(
    *,
    source: str,
    level: str,
    event_name: str | None = None,
    uk_severity_level: int | None = None,
) -> int:
    base_by_level = {"low": 20, "medium": 45, "high": 70, "critical": 90}
    score = base_by_level.get(level, 20)

    if event_name:
        en = event_name.lower()
        if "flash" in en:
            score += 10
        if "coastal" in en:
            score += 5

    if source == "uk_ea" and uk_severity_level is not None:
        mapped = {1: 90, 2: 70, 3: 45, 4: 25}
        score = mapped.get(uk_severity_level, score)

    return max(0, min(100, int(score)))


def fetch_nws_flood_alerts(limit: int = 100) -> List[Dict[str, Any]]:
    headers = {
        "User-Agent": "DisasterRiskDashboard/0.1 (local dev)",
        "Accept": "application/geo+json",
    }

    seen_ids: set[str] = set()
    out: List[Dict[str, Any]] = []

    # keep zone fetches bounded (so we don’t hammer NWS)
    zone_fetch_budget = 40

    for event_name in NWS_FLOOD_EVENTS:
        params = {"event": event_name}
        resp = requests.get(NWS_ACTIVE_ALERTS_URL, params=params, headers=headers, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        features = data.get("features", []) or []

        for f in features:
            props = f.get("properties", {}) or {}
            alert_id = props.get("id") or f.get("id")
            if not alert_id or alert_id in seen_ids:
                continue
            seen_ids.add(alert_id)

            # 1) try alert geometry centroid
            lat, lon = _pick_point_from_geojson(f.get("geometry"))

            # 2) fallback: fetch first affected zone geometry centroid
            if (lat is None or lon is None) and zone_fetch_budget > 0:
                zones = props.get("affectedZones") or []
                if isinstance(zones, list) and zones:
                    lat2, lon2 = _fetch_zone_point(headers, zones[0])
                    if lat2 is not None and lon2 is not None:
                        lat, lon = lat2, lon2
                    zone_fetch_budget -= 1

            lvl = _severity_level_from_nws(props)
            score = _severity_score_for_flood(source="nws", level=lvl, event_name=props.get("event"))

            t = props.get("sent") or props.get("effective") or _iso_utc_now()

            out.append(
                {
                    "source": "nws",
                    "event_type": "flood",
                    "source_event_id": alert_id,
                    "time_utc": t,
                    "place": props.get("areaDesc") or props.get("headline") or props.get("event") or "NWS Flood Alert",
                    "magnitude": None,
                    "depth_km": None,
                    "lon": lon,
                    "lat": lat,
                    "severity_score": score,
                    "severity_level": lvl,
                    "url": props.get("web") or props.get("@id") or None,
                    "hazard_subtype": props.get("event"),
                }
            )

            if len(out) >= limit:
                return out

    return out


# -------- UK Environment Agency Flood Monitoring --------
UK_EA_FLOODS_URL = "https://environment.data.gov.uk/flood-monitoring/id/floods"


def _severity_level_from_uk(severity_level: int | None) -> str:
    if severity_level == 1:
        return "critical"
    if severity_level == 2:
        return "high"
    if severity_level == 3:
        return "medium"
    return "low"


def fetch_uk_flood_alerts(limit: int = 100) -> List[Dict[str, Any]]:
    resp = requests.get(UK_EA_FLOODS_URL, timeout=20)
    resp.raise_for_status()
    data = resp.json()

    items = data.get("items", []) or []
    out: List[Dict[str, Any]] = []

    for it in items[: max(limit, 0)]:
        sev_lvl_num = it.get("severityLevel")
        lvl = _severity_level_from_uk(sev_lvl_num)
        score = _severity_score_for_flood(source="uk_ea", level=lvl, uk_severity_level=sev_lvl_num)

        flood_area = it.get("floodArea") or {}
        lat = flood_area.get("lat")
        lon = flood_area.get("long")
        place = (
            flood_area.get("label")
            or flood_area.get("areaName")
            or it.get("description")
            or "UK Flood Alert"
        )

        t = it.get("timeRaised") or _iso_utc_now()

        out.append(
            {
                "source": "uk_ea",
                "event_type": "flood",
                "source_event_id": it.get("@id") or it.get("floodAreaID") or place,
                "time_utc": t,
                "place": place,
                "magnitude": None,
                "depth_km": None,
                "lon": float(lon) if lon is not None else None,
                "lat": float(lat) if lat is not None else None,
                "severity_score": score,
                "severity_level": lvl,
                "url": it.get("@id"),
                "hazard_subtype": it.get("severity") or None,
            }
        )

    return out
