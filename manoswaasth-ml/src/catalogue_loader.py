"""
Catalogue Loader and Validator Module

Handles loading and schema/data integrity validation for the Manoswaasth Dincharya
predefined task catalogue.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional

REQUIRED_CATEGORIES = {"work_break", "after_work", "before_bed", "after_waking"}
REQUIRED_DOSHAS = {"vata", "pitta", "kapha"}
EXPECTED_TASK_COUNT = 35


def get_default_catalogue_path() -> Path:
    """Return the default path to the task catalogue JSON file."""
    # Try relative to this file: ../data/task_catalogue.json
    local_data = Path(__file__).resolve().parent.parent / "data" / "task_catalogue.json"
    if local_data.exists():
        return local_data
    # Fallback to repository root
    repo_file = Path(__file__).resolve().parent.parent.parent / "manoswaasth_dincharya_task_catalogue_v1.json"
    if repo_file.exists():
        return repo_file
    return local_data


def validate_catalogue(catalogue: Dict[str, Any]) -> bool:
    """
    Validate the task catalogue for structural and domain integrity.

    Verifies:
    1. Catalogue is a dictionary containing a 'tasks' list.
    2. Exactly 35 activities are present.
    3. Task IDs are unique.
    4. All four expected categories are represented.
    5. Every task has valid attributes, positive duration, and dosha affinities (1-3).
    6. Safety restrictions metadata is present.

    Raises:
        ValueError: If any validation rule is violated.
    """
    if not isinstance(catalogue, dict):
        raise ValueError("Catalogue root must be a JSON object (dictionary).")

    tasks = catalogue.get("tasks")
    if not isinstance(tasks, list):
        raise ValueError("Catalogue must contain a 'tasks' list.")

    if len(tasks) != EXPECTED_TASK_COUNT:
        raise ValueError(
            f"Catalogue must contain exactly {EXPECTED_TASK_COUNT} tasks, found {len(tasks)}."
        )

    task_ids = set()
    found_categories = set()

    for idx, task in enumerate(tasks):
        if not isinstance(task, dict):
            raise ValueError(f"Task at index {idx} must be a dictionary.")

        task_id = task.get("task_id")
        if not task_id or not isinstance(task_id, str):
            raise ValueError(f"Task at index {idx} has missing or invalid 'task_id'.")
        if task_id in task_ids:
            raise ValueError(f"Duplicate task_id '{task_id}' detected at index {idx}.")
        task_ids.add(task_id)

        category = task.get("category")
        if not category or category not in REQUIRED_CATEGORIES:
            raise ValueError(
                f"Task '{task_id}' has invalid category '{category}'. Expected one of {sorted(REQUIRED_CATEGORIES)}."
            )
        found_categories.add(category)

        duration = task.get("duration_minutes")
        if duration is None or not isinstance(duration, (int, float)) or duration <= 0:
            raise ValueError(
                f"Task '{task_id}' has invalid duration_minutes: {duration}. Must be positive."
            )

        dosha_affinity = task.get("dosha_affinity")
        if not isinstance(dosha_affinity, dict):
            raise ValueError(f"Task '{task_id}' is missing a valid 'dosha_affinity' dictionary.")

        missing_doshas = REQUIRED_DOSHAS - set(dosha_affinity.keys())
        if missing_doshas:
            raise ValueError(
                f"Task '{task_id}' is missing dosha affinities for: {sorted(missing_doshas)}."
            )

        for dosha_name in REQUIRED_DOSHAS:
            val = dosha_affinity[dosha_name]
            if not isinstance(val, (int, float)) or val not in {1, 2, 3}:
                raise ValueError(
                    f"Task '{task_id}' has invalid affinity for '{dosha_name}': {val}. Must be 1, 2, or 3."
                )

        if "safety_restrictions" not in task:
            raise ValueError(f"Task '{task_id}' is missing the 'safety_restrictions' field.")

    missing_categories = REQUIRED_CATEGORIES - found_categories
    if missing_categories:
        raise ValueError(f"Catalogue is missing tasks for categories: {sorted(missing_categories)}.")

    return True


def load_catalogue(path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load and validate the JSON task catalogue.

    Args:
        path: Optional file path. If None, uses default path.

    Returns:
        Dict[str, Any]: The loaded and validated catalogue dictionary.

    Raises:
        FileNotFoundError: If the catalogue file does not exist.
        ValueError: If the catalogue content fails validation or is invalid JSON.
    """
    catalogue_path = Path(path) if path else get_default_catalogue_path()

    if not catalogue_path.exists():
        raise FileNotFoundError(
            f"Catalogue file not found at: {catalogue_path}. "
            "Please ensure the catalogue JSON exists."
        )

    with open(catalogue_path, "r", encoding="utf-8") as f:
        try:
            catalogue = json.load(f)
        except json.JSONDecodeError as exc:
            raise ValueError(f"Invalid JSON in catalogue file '{catalogue_path}': {exc}") from exc

    validate_catalogue(catalogue)
    return catalogue


def get_tasks_by_category(catalogue: Dict[str, Any], category: str) -> List[Dict[str, Any]]:
    """
    Retrieve all tasks matching a specific category from the catalogue.
    """
    tasks = catalogue.get("tasks", [])
    return [task for task in tasks if task.get("category") == category]

