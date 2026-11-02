"""
Suitability Scoring Engine Module

Core scoring and ranking engine for Manoswaasth Dincharya recommendations.
Calculates Dosha Suitability Scores, Context Suitability Scores, and 70:30 weighted
Final Suitability Scores with deterministic tie-breaking.
"""

from typing import Any, Callable, Dict, List, Optional

from .catalogue_loader import load_catalogue
from .preprocessing import get_dosha_components, normalize_category, normalize_prakriti

# Default category maximum slot budgets (in minutes) for context score normalization
DEFAULT_CATEGORY_BUDGETS: Dict[str, int] = {
    "work_break": 5,
    "after_work": 15,
    "before_bed": 15,
    "after_waking": 15,
}

DOSHA_WEIGHT_DEFAULT = 0.70
CONTEXT_WEIGHT_DEFAULT = 0.30


def calculate_dosha_score(prakriti: str, task: Dict[str, Any]) -> float:
    """
    Calculate the normalized Dosha Suitability Score (0 to 100) for a given Prakriti and task.

    Formulas:
    - Single-dosha: (Affinity / 3) * 100
    - Dual-dosha:   ((Affinity 1 + Affinity 2) / 2) / 3 * 100
    - Triple-dosha: ((Affinity 1 + Affinity 2 + Affinity 3) / 3) / 3 * 100

    Args:
        prakriti: User Prakriti (e.g. 'Vata', 'vata-pitta', 'vata-pitta-kapha').
        task: Activity dictionary containing 'dosha_affinity'.

    Returns:
        float: Normalised score rounded to two decimal places.

    Raises:
        ValueError: If Prakriti or task affinities are missing or invalid.
    """
    norm_prakriti = normalize_prakriti(prakriti)
    components = get_dosha_components(norm_prakriti)

    affinities = task.get("dosha_affinity")
    if not isinstance(affinities, dict):
        raise ValueError(f"Task '{task.get('task_id', 'unknown')}' missing 'dosha_affinity' dictionary.")

    values = []
    for dosha in components:
        if dosha not in affinities:
            raise ValueError(
                f"Task '{task.get('task_id')}' missing affinity value for component dosha '{dosha}'."
            )
        val = affinities[dosha]
        if not isinstance(val, (int, float)) or not (1 <= val <= 3):
            raise ValueError(f"Invalid affinity value '{val}' for dosha '{dosha}'. Must be between 1 and 3.")
        values.append(float(val))

    # Mean affinity across Prakriti components
    mean_affinity = sum(values) / len(values)

    # Scale to 0-100: (mean_affinity / 3.0) * 100
    score = (mean_affinity / 3.0) * 100.0
    return round(score, 2)


def calculate_context_score(
    task: Dict[str, Any],
    available_minutes: int,
    category: str,
    category_budgets: Optional[Dict[str, int]] = None,
    custom_context_fn: Optional[Callable[[Dict[str, Any], int, str], float]] = None,
) -> float:
    """
    Calculate the Context Suitability Score (0 to 100) for an activity.

    Context Score = (Activity Duration / Available Slot Budget) * 100
    The available slot budget is capped by the category's recommended maximum duration
    so that excessively long free periods do not distort scoring:
    slot_budget = min(available_minutes, category_max_budget)

    Args:
        task: Activity dictionary containing 'duration_minutes'.
        available_minutes: Minutes available in the schedule for this slot.
        category: Recommendation category.
        category_budgets: Optional custom category budget dictionary.
        custom_context_fn: Optional pluggable custom context scoring function.

    Returns:
        float: Normalised score rounded to two decimal places (0.0 to 100.0).
    """
    if custom_context_fn is not None:
        return round(custom_context_fn(task, available_minutes, category), 2)

    duration = task.get("duration_minutes")
    if duration is None or duration <= 0:
        return 0.0

    if available_minutes <= 0 or duration > available_minutes:
        return 0.0

    norm_category = normalize_category(category)
    budgets = category_budgets if category_budgets is not None else DEFAULT_CATEGORY_BUDGETS
    max_budget = budgets.get(norm_category, 15)

    slot_budget = min(available_minutes, max_budget)
    if slot_budget <= 0:
        return 0.0

    # Calculate time-fit score, capped at 100
    raw_score = (duration / slot_budget) * 100.0
    capped_score = min(100.0, max(0.0, raw_score))
    return round(capped_score, 2)


def calculate_final_score(
    dosha_score: float,
    context_score: float,
    dosha_weight: float = DOSHA_WEIGHT_DEFAULT,
    context_weight: float = CONTEXT_WEIGHT_DEFAULT,
) -> float:
    """
    Calculate the final weighted suitability score:
    Final Score = (dosha_weight * dosha_score) + (context_weight * context_score)

    Both component scores must be in range 0-100.
    Returns score rounded to two decimal places.
    """
    if not (0.0 <= dosha_score <= 100.0):
        raise ValueError(f"dosha_score must be between 0 and 100, got {dosha_score}.")
    if not (0.0 <= context_score <= 100.0):
        raise ValueError(f"context_score must be between 0 and 100, got {context_score}.")

    final = (dosha_weight * dosha_score) + (context_weight * context_score)
    final_clamped = min(100.0, max(0.0, final))
    return round(final_clamped, 2)


def filter_eligible_tasks(
    tasks: List[Dict[str, Any]],
    category: str,
    available_minutes: int,
) -> List[Dict[str, Any]]:
    """
    Filter activities that match the requested category and whose duration
    does not exceed the available time.

    Activities exceeding available time or belonging to different categories
    are strictly excluded.

    Args:
        tasks: List of task dictionaries.
        category: Target category string.
        available_minutes: Available time in minutes.

    Returns:
        List[Dict[str, Any]]: Filtered eligible task dictionaries.
    """
    if available_minutes <= 0:
        return []

    norm_category = normalize_category(category)
    eligible = []
    for task in tasks:
        task_category = normalize_category(task.get("category", ""))
        duration = task.get("duration_minutes", 0)
        if task_category == norm_category and duration <= available_minutes:
            eligible.append(task)
    return eligible


def rank_eligible_tasks(
    prakriti: str,
    category: str,
    available_minutes: int,
    tasks: Optional[List[Dict[str, Any]]] = None,
    catalogue: Optional[Dict[str, Any]] = None,
    category_budgets: Optional[Dict[str, int]] = None,
    dosha_weight: float = DOSHA_WEIGHT_DEFAULT,
    context_weight: float = CONTEXT_WEIGHT_DEFAULT,
) -> Dict[str, Any]:
    """
    Evaluate, score, and rank eligible tasks for a user's Prakriti and available time.

    Tie-breaking rule:
    Primary sort: final_score DESC
    Secondary sort (tie-breaker): task_id ASC (alphabetical)

    Args:
        prakriti: User Prakriti classification.
        category: Recommendation category.
        available_minutes: Available time in minutes.
        tasks: Optional preloaded task list.
        catalogue: Optional preloaded catalogue dictionary.
        category_budgets: Optional category budget overrides.
        dosha_weight: Weight for dosha score (default 0.70).
        context_weight: Weight for context score (default 0.30).

    Returns:
        Dict[str, Any]: Structured output with ranked tasks and explanations.
    """
    norm_prakriti = normalize_prakriti(prakriti)
    norm_category = normalize_category(category)

    if tasks is None:
        if catalogue is None:
            catalogue = load_catalogue()
        tasks = catalogue.get("tasks", [])

    eligible_raw_tasks = filter_eligible_tasks(tasks, norm_category, available_minutes)

    if not eligible_raw_tasks:
        explanation = (
            f"No activities found in category '{norm_category}' that fit within the "
            f"available duration of {available_minutes} minute(s)."
        )
        return {
            "prakriti": norm_prakriti,
            "category": norm_category,
            "available_minutes": available_minutes,
            "eligible_tasks": [],
            "explanation": explanation,
        }

    scored_tasks = []
    for task in eligible_raw_tasks:
        d_score = calculate_dosha_score(norm_prakriti, task)
        c_score = calculate_context_score(
            task=task,
            available_minutes=available_minutes,
            category=norm_category,
            category_budgets=category_budgets,
        )
        f_score = calculate_final_score(
            dosha_score=d_score,
            context_score=c_score,
            dosha_weight=dosha_weight,
            context_weight=context_weight,
        )

        scored_item = {
            "task_id": task["task_id"],
            "title": task["title"],
            "duration_minutes": task["duration_minutes"],
            "dosha_score": d_score,
            "context_score": c_score,
            "final_score": f_score,
            "eligible": True,
            "description": task.get("description", ""),
            "safety_restrictions": task.get("safety_restrictions", []),
            "ayurvedic_principle": task.get("ayurvedic_principle", ""),
            "intensity": task.get("intensity", "low"),
        }
        scored_tasks.append(scored_item)

    # Deterministic sorting: final_score DESC, then task_id ASC
    scored_tasks.sort(key=lambda t: (-t["final_score"], t["task_id"]))

    return {
        "prakriti": norm_prakriti,
        "category": norm_category,
        "available_minutes": available_minutes,
        "eligible_tasks": scored_tasks,
        "explanation": f"Successfully evaluated and ranked {len(scored_tasks)} eligible activities.",
    }

