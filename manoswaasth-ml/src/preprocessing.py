"""
Preprocessing Module

Provides input normalization, validation, and parsing functions for user Prakriti,
schedule times, and category descriptors.
"""

from datetime import time
import re
from typing import Any, Dict, List, Set, Union

VALID_INDIVIDUAL_DOSHAS = ("vata", "pitta", "kapha")

SUPPORTED_PRAKRITI_PROFILES = [
    "vata",
    "pitta",
    "kapha",
    "vata-pitta",
    "vata-kapha",
    "pitta-kapha",
    "vata-pitta-kapha",
]

# Canonical ordering map for multi-dosha combinations
DOSHA_CANONICAL_ORDER = {"vata": 0, "pitta": 1, "kapha": 2}

CATEGORY_ALIASES: Dict[str, str] = {
    "work_break": "work_break",
    "work break": "work_break",
    "during work break": "work_break",
    "during_work_break": "work_break",
    "after_work": "after_work",
    "after work": "after_work",
    "after returning home": "after_work",
    "after_returning_home": "after_work",
    "returning_home": "after_work",
    "before_bed": "before_bed",
    "before bed": "before_bed",
    "before going to bed": "before_bed",
    "bedtime": "before_bed",
    "after_waking": "after_waking",
    "after waking": "after_waking",
    "after waking up": "after_waking",
    "morning": "after_waking",
}


def normalize_prakriti(prakriti: str) -> str:
    """
    Normalize and validate Prakriti classification strings.

    Handles case insensitivity, surrounding whitespace, underscores, and unordered
    dual/triple combinations (e.g. 'Pitta-Vata' -> 'vata-pitta').

    Args:
        prakriti: User Prakriti string.

    Returns:
        str: Canonical lower-case hyphenated Prakriti string.

    Raises:
        ValueError: If the Prakriti is unknown or invalid.
    """
    if not prakriti or not isinstance(prakriti, str):
        raise ValueError(
            f"Invalid Prakriti input: {prakriti}. Expected one of {SUPPORTED_PRAKRITI_PROFILES}."
        )

    cleaned = prakriti.strip().lower().replace("_", "-").replace(" ", "-")
    # Split by hyphen and filter empty parts
    parts = [p for p in cleaned.split("-") if p]

    if not parts:
        raise ValueError("Prakriti string cannot be empty.")

    # Validate that every part is a recognized single dosha
    for part in parts:
        if part not in DOSHA_CANONICAL_ORDER:
            raise ValueError(
                f"Unknown dosha '{part}' in Prakriti '{prakriti}'. "
                f"Supported profiles: {SUPPORTED_PRAKRITI_PROFILES}"
            )

    # Remove duplicates preserving order, then sort by canonical dosha order
    unique_parts = list(dict.fromkeys(parts))
    sorted_parts = sorted(unique_parts, key=lambda d: DOSHA_CANONICAL_ORDER[d])
    canonical = "-".join(sorted_parts)

    if canonical not in SUPPORTED_PRAKRITI_PROFILES:
        raise ValueError(
            f"Prakriti '{prakriti}' normalized to '{canonical}', which is not in "
            f"supported classifications: {SUPPORTED_PRAKRITI_PROFILES}"
        )

    return canonical


def get_dosha_components(normalized_prakriti: str) -> List[str]:
    """
    Split a normalized Prakriti string into its component individual dosha names.
    """
    return normalized_prakriti.split("-")


def normalize_category(category: str) -> str:
    """
    Normalize and validate activity category names.

    Args:
        category: Input category name or alias.

    Returns:
        str: Canonical category ID ('work_break', 'after_work', 'before_bed', 'after_waking').

    Raises:
        ValueError: If the category is not recognized.
    """
    if not category or not isinstance(category, str):
        raise ValueError("Category must be a non-empty string.")

    cleaned = category.strip().lower()
    if cleaned in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[cleaned]

    # Try matching by replacing underscores/hyphens with spaces
    sanitized = re.sub(r"[-_]+", " ", cleaned)
    if sanitized in CATEGORY_ALIASES:
        return CATEGORY_ALIASES[sanitized]

    valid = sorted(list(set(CATEGORY_ALIASES.values())))
    raise ValueError(f"Unknown category '{category}'. Expected one of: {valid}")


def parse_time_string(time_str: Union[str, time]) -> time:
    """
    Parse a time string in 'HH:MM' (or 'H:MM') 24-hour format into a datetime.time object.

    Args:
        time_str: Time string (e.g. '13:00', '08:30') or existing datetime.time.

    Returns:
        datetime.time: Parsed time object.

    Raises:
        ValueError: If format or values are invalid.
    """
    if isinstance(time_str, time):
        return time(time_str.hour, time_str.minute)

    if not isinstance(time_str, str):
        raise ValueError(f"Time input must be a string or datetime.time, got {type(time_str).__name__}.")

    pattern = r"^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$"
    match = re.match(pattern, time_str.strip())
    if not match:
        raise ValueError(
            f"Invalid time string '{time_str}'. Expected 24-hour 'HH:MM' format (00:00 to 23:59)."
        )

    hour, minute = int(match.group(1)), int(match.group(2))
    return time(hour, minute)


def validate_user_schedule(schedule: Dict[str, Any]) -> Dict[str, time]:
    """
    Validate and parse all required schedule times from user input.

    Expected keys:
    - break_start: str or time
    - break_end: str or time
    - return_home_time: str or time
    - sleep_time: str or time
    - wake_time: str or time

    Returns:
        Dict[str, time]: Parsed time objects for each field.

    Raises:
        ValueError: If any key is missing or invalid.
    """
    if not isinstance(schedule, dict):
        raise ValueError("Schedule must be a dictionary.")

    required_keys = ["break_start", "break_end", "return_home_time", "sleep_time", "wake_time"]
    missing = [k for k in required_keys if k not in schedule]
    if missing:
        raise ValueError(f"Missing required schedule fields: {missing}")

    parsed: Dict[str, time] = {}
    for key in required_keys:
        try:
            parsed[key] = parse_time_string(schedule[key])
        except ValueError as exc:
            raise ValueError(f"Error validating schedule field '{key}': {exc}") from exc

    return parsed

