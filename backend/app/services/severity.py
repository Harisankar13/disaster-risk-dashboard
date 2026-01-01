from __future__ import annotations

from typing import Tuple


def score_earthquake(magnitude: float | None, depth_km: float | None) -> Tuple[int, str]:
    """
    Simple, explainable severity scoring (0-100) for earthquakes.
    Returns (score, level).
    """
    # Base score by magnitude
    mag = magnitude if magnitude is not None else 0.0

    if mag < 4.0:
        score = 10
    elif mag < 5.0:
        score = 25
    elif mag < 6.0:
        score = 45
    elif mag < 7.0:
        score = 70
    else:
        score = 90

    # Depth adjustment
    if depth_km is not None:
        if depth_km < 20:
            score += 10
        elif depth_km > 70:
            score -= 10

    # Clamp
    score = max(0, min(100, score))

    # Level mapping
    if score <= 24:
        level = "low"
    elif score <= 49:
        level = "medium"
    elif score <= 74:
        level = "high"
    else:
        level = "critical"

    return score, level