from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Query

from app.services.usgs_client import fetch_recent_earthquakes
from app.services.flood_client import fetch_nws_flood_alerts, fetch_uk_flood_alerts

router = APIRouter(prefix="/events", tags=["events"])

SeverityLevel = Literal["low", "medium", "high", "critical"]
HazardType = Literal["earthquake", "flood"]

SEVERITY_RANK: dict[str, int] = {
    "low": 1,
    "medium": 2,
    "high": 3,
    "critical": 4,
}


def _parse_iso_utc(ts: str | None) -> datetime | None:
    if not ts:
        return None
    try:
        dt = datetime.fromisoformat(ts)
        # make sure timezone-aware in UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


@router.get("")
def list_events(
    hazard: HazardType = Query(default="earthquake", description="Which hazard stream to return"),
    # Earthquake params
    feed: str = Query(default="all_day", description="USGS feed for earthquakes"),
    min_magnitude: float | None = Query(default=None, ge=0.0),
    # Shared params
    limit: int = Query(default=50, ge=1, le=200),
    since_hours: int | None = Query(default=24, ge=1, le=168),
    min_severity_level: SeverityLevel | None = Query(default=None),
):
    # ---------- Fetch ----------
    if hazard == "earthquake":
        events = fetch_recent_earthquakes(feed=feed, limit=limit, min_magnitude=min_magnitude)
    else:
        # Flood: merge NWS + UK EA
        events = []
        events.extend(fetch_nws_flood_alerts(limit=limit))
        # only add UK if there is room
        remaining = max(0, limit - len(events))
        if remaining > 0:
            events.extend(fetch_uk_flood_alerts(limit=remaining))

    # ---------- Filter: since_hours ----------
    if since_hours is not None:
        cutoff = datetime.now(timezone.utc) - timedelta(hours=since_hours)
        filtered = []
        for e in events:
            dt = _parse_iso_utc(e.get("time_utc"))
            # if dt missing, keep it (so we don't hide alerts)
            if dt is None or dt >= cutoff:
                filtered.append(e)
        events = filtered

    # ---------- Filter: min_severity_level ----------
    if min_severity_level is not None:
        min_rank = SEVERITY_RANK[min_severity_level]
        events = [e for e in events if SEVERITY_RANK.get(e.get("severity_level", "low"), 1) >= min_rank]

    # ---------- Sort: severity desc, then time desc ----------
    def sort_key(e: dict) -> tuple:
        dt = _parse_iso_utc(e.get("time_utc"))
        ts = dt.timestamp() if dt else 0
        return (e.get("severity_score", 0), ts)

    events = sorted(events, key=sort_key, reverse=True)

    return {
        "hazard": hazard,
        "count": len(events),
        "events": events,
    }
