from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

from app.services.severity import score_earthquake

USGS_BASE_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary"


def fetch_recent_earthquakes(
    feed: str = "all_hour",
    limit: int = 50,
    min_magnitude: Optional[float] = None,
) -> List[Dict[str, Any]]:
    """
    Fetch recent earthquakes from USGS GeoJSON feeds.
    feed examples: all_hour, all_day, significant_hour, 4.5_day, etc.
    """
    url = f"{USGS_BASE_URL}/{feed}.geojson"
    resp = requests.get(url, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    features = data.get("features", [])
    events: List[Dict[str, Any]] = []

    for f in features:
        props = f.get("properties", {}) or {}
        geom = f.get("geometry", {}) or {}
        coords = geom.get("coordinates", []) or []

        mag = props.get("mag")
        if min_magnitude is not None and mag is not None and mag < min_magnitude:
            continue

        # USGS coords are [lon, lat, depth_km]
        lon = coords[0] if len(coords) > 0 else None
        lat = coords[1] if len(coords) > 1 else None
        depth_km = coords[2] if len(coords) > 2 else None

        # Convert epoch ms -> ISO 8601 UTC
        time_ms = props.get("time")
        time_utc = (
            datetime.fromtimestamp(time_ms / 1000, tz=timezone.utc).isoformat()
            if isinstance(time_ms, (int, float))
            else None
        )

        # Severity scoring
        score, level = score_earthquake(mag, depth_km)

        events.append(
            {
                "source": "usgs",
                "event_type": "earthquake",
                "source_event_id": f.get("id"),
                "time_utc": time_utc,
                "place": props.get("place"),
                "magnitude": mag,
                "depth_km": depth_km,
                "lon": lon,
                "lat": lat,
                "severity_score": score,
                "severity_level": level,
                "url": props.get("url"),
            }
        )

    return events