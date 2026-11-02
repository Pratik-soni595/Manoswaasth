"""
Feature Engineering Module

Computes derived duration features and available recommendation time budgets
from user schedule inputs, with robust handling of midnight crossings.
"""

from datetime import time
from typing import Any, Dict, Union

from .preprocessing import normalize_category, parse_time_string, validate_user_schedule

DEFAULT_BEDTIME_BUDGET = 15
DEFAULT_MORNING_BUDGET = 15


def time_to_minutes(t: time) -> int:
    """Convert a datetime.time to minutes since midnight."""
    return t.hour * 60 + t.minute


def calculate_duration_minutes(
    start_time: Union[str, time],
    end_time: Union[str, time],
    allow_midnight_crossing: bool = True,
) -> int:
    """
    Calculate duration in minutes between start_time and end_time.

    Args:
        start_time: Start time ('HH:MM' or datetime.time).
        end_time: End time ('HH:MM' or datetime.time).
        allow_midnight_crossing: If True, end_time < start_time implies crossing midnight.
                                 If False, end_time <= start_time raises ValueError.

    Returns:
        int: Duration in minutes.

    Raises:
        ValueError: For invalid or contradictory times.
    """
    start_t = parse_time_string(start_time)
    end_t = parse_time_string(end_time)

    start_mins = time_to_minutes(start_t)
    end_mins = time_to_minutes(end_t)

    if end_mins > start_mins:
        return end_mins - start_mins

    if end_mins == start_mins:
        # Zero duration is contradictory for break/sleep/routine slots
        raise ValueError(
            f"Start time ({start_t.strftime('%H:%M')}) and end time "
            f"({end_t.strftime('%H:%M')}) are identical (duration is 0 minutes)."
        )

    # end_mins < start_mins
    if not allow_midnight_crossing:
        raise ValueError(
            f"End time ({end_t.strftime('%H:%M')}) is earlier than start time "
            f"({start_t.strftime('%H:%M')}) and midnight crossing is not permitted for this slot."
        )

    # Midnight crossing calculation (e.g. 23:00 to 07:00 -> 60 + 420 = 480 mins)
    minutes_until_midnight = (24 * 60) - start_mins
    return minutes_until_midnight + end_mins


def calculate_derived_features(schedule: Dict[str, Any]) -> Dict[str, int]:
    """
    Calculate derived duration features from a user schedule:
    - break_duration: Duration of work break in minutes.
    - sleep_duration: Sleep duration accounting for midnight crossing.
    - available_after_work: Available evening time from returning home until sleep time.

    Args:
        schedule: Raw or parsed schedule dictionary.

    Returns:
        Dict[str, int]: Derived duration features.

    Raises:
        ValueError: If schedule is invalid or has contradictory times.
    """
    parsed = validate_user_schedule(schedule)

    # Break duration: does not cross midnight (daytime work break)
    break_dur = calculate_duration_minutes(
        parsed["break_start"], parsed["break_end"], allow_midnight_crossing=False
    )
    if break_dur <= 0:
        raise ValueError(f"Break duration must be positive, got {break_dur} minutes.")

    # Sleep duration: crosses midnight typically (e.g. 23:00 -> 07:00)
    sleep_dur = calculate_duration_minutes(
        parsed["sleep_time"], parsed["wake_time"], allow_midnight_crossing=True
    )

    # Available after returning home until sleep time: accounts for midnight crossing
    # E.g. returning 18:30, sleep 23:00 -> 270 mins
    # Returning 22:30, sleep 01:00 -> 150 mins
    evening_avail = calculate_duration_minutes(
        parsed["return_home_time"], parsed["sleep_time"], allow_midnight_crossing=True
    )

    return {
        "break_duration": break_dur,
        "sleep_duration": sleep_dur,
        "available_after_work": evening_avail,
    }


def calculate_available_time(
    user_schedule: Dict[str, Any],
    category: str,
    default_bedtime_budget: int = DEFAULT_BEDTIME_BUDGET,
    default_morning_budget: int = DEFAULT_MORNING_BUDGET,
) -> int:
    """
    Calculate the available time in minutes for a specific recommendation category.

    Categories:
    - work_break: Break duration (break_end - break_start).
    - after_work: Time between returning home and bedtime.
    - before_bed: Configurable default bedtime budget (default 15 minutes).
    - after_waking: Configurable default morning budget (default 15 minutes).

    Args:
        user_schedule: User schedule dictionary.
        category: Recommendation category.
        default_bedtime_budget: Configurable budget for bedtime routine.
        default_morning_budget: Configurable budget for morning routine.

    Returns:
        int: Available time in minutes.
    """
    norm_cat = normalize_category(category)
    derived = calculate_derived_features(user_schedule)

    if norm_cat == "work_break":
        return derived["break_duration"]
    elif norm_cat == "after_work":
        return derived["available_after_work"]
    elif norm_cat == "before_bed":
        if default_bedtime_budget <= 0:
            raise ValueError("Default bedtime budget must be positive.")
        return default_bedtime_budget
    elif norm_cat == "after_waking":
        if default_morning_budget <= 0:
            raise ValueError("Default morning budget must be positive.")
        return default_morning_budget
    else:
        raise ValueError(f"Unsupported category for time calculation: {category}")

