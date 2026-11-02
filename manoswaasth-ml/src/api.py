"""
FastAPI Application Module for Dincharya Recommendations (Phase 3).

Exposes inference endpoints for the trained Random Forest recommendation models.
"""

import asyncio
from contextlib import asynccontextmanager
import logging
import os
from pathlib import Path
import platform
import re
import sys
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field
import sklearn

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from src.catalogue_loader import load_catalogue
from src.feature_engineering import calculate_derived_features
from src.model_pipeline import CATEGORIES, load_model_bundle, predict_tasks
from src.preprocessing import SUPPORTED_PRAKRITI_PROFILES, normalize_prakriti, validate_user_schedule

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("dincharya_api")

DEFAULT_MODEL_PATH = PACKAGE_ROOT / "models" / "dincharya_models.joblib"
DEFAULT_CATALOGUE_PATH = PACKAGE_ROOT / "data" / "task_catalogue.json"

TIME_24H_REGEX = r"^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"


class ServiceState:
    """Encapsulates loaded models, catalogue, and configuration."""

    def __init__(
        self,
        model_path: Optional[Path] = None,
        catalogue_path: Optional[Path] = None,
    ) -> None:
        self.model_path = model_path or Path(
            os.getenv("DINCHARYA_MODEL_PATH", str(DEFAULT_MODEL_PATH))
        )
        self.catalogue_path = catalogue_path or Path(
            os.getenv("DINCHARYA_CATALOGUE_PATH", str(DEFAULT_CATALOGUE_PATH))
        )
        self.bundle: Optional[Dict[str, Any]] = None
        self.catalogue: Optional[Dict[str, Any]] = None
        self.tasks_by_id: Dict[str, Dict[str, Any]] = {}

    def load_artifacts(self) -> None:
        """Load and validate model bundle and task catalogue at startup."""
        logger.info(f"Loading task catalogue from: {self.catalogue_path}")
        self.catalogue = load_catalogue(str(self.catalogue_path))
        self.tasks_by_id = {task["task_id"]: task for task in self.catalogue.get("tasks", [])}

        logger.info(f"Loading model bundle from: {self.model_path}")
        if not self.model_path.exists():
            raise FileNotFoundError(
                f"Model bundle artifact not found at '{self.model_path}'. "
                "Ensure Phase 2 model training has been completed via `python manoswaasth-ml/src/train.py`."
            )

        self.bundle = load_model_bundle(self.model_path)
        self._check_compatibility(self.bundle)

    @staticmethod
    def _check_compatibility(bundle: Dict[str, Any]) -> None:
        """Verify artifact metadata against the runtime environment."""
        bundle_py = bundle.get("python_version", "")
        curr_py = platform.python_version()
        if bundle_py and bundle_py.split(".")[0] != curr_py.split(".")[0]:
            raise RuntimeError(
                f"Major Python version mismatch: Model bundle trained on Python {bundle_py}, "
                f"but runtime is {curr_py}."
            )

        bundle_sklearn = bundle.get("sklearn_version", "")
        curr_sklearn = sklearn.__version__
        if bundle_sklearn and bundle_sklearn.split(".")[:2] != curr_sklearn.split(".")[:2]:
            logger.warning(
                f"scikit-learn version difference detected: Bundle trained on {bundle_sklearn}, "
                f"runtime is {curr_sklearn}."
            )


# Pydantic Request & Response Schemas
class DincharyaRecommendationRequest(BaseModel):
    primary_dosha: str = Field(
        ...,
        description="User Prakriti profile (e.g. 'vata', 'pitta-kapha', 'vata-pitta-kapha')",
        examples=["vata-pitta"],
    )
    break_start: str = Field(
        ...,
        description="Work break start time in 24-hr HH:MM format",
        pattern=TIME_24H_REGEX,
        examples=["13:00"],
    )
    break_end: str = Field(
        ...,
        description="Work break end time in 24-hr HH:MM format",
        pattern=TIME_24H_REGEX,
        examples=["13:10"],
    )
    return_home_time: str = Field(
        ...,
        description="Time user returns home from work in 24-hr HH:MM format",
        pattern=TIME_24H_REGEX,
        examples=["18:30"],
    )
    sleep_time: str = Field(
        ...,
        description="Target bedtime in 24-hr HH:MM format",
        pattern=TIME_24H_REGEX,
        examples=["23:00"],
    )
    wake_time: str = Field(
        ...,
        description="Wake-up time in 24-hr HH:MM format",
        pattern=TIME_24H_REGEX,
        examples=["06:30"],
    )

    model_config = ConfigDict(extra="forbid")


class TaskRecommendation(BaseModel):
    task_id: str
    title: str
    description: str
    duration_minutes: int
    safety_restrictions: List[str]
    ayurvedic_principle: str


class ModelInfo(BaseModel):
    name: str = "RandomForestClassifier"
    version: str = "1.0"
    scikit_learn_version: Optional[str] = None
    note: str = (
        "Predictions reflect agreement with the rule-based suitability scoring heuristic. "
        "These are non-medical lifestyle recommendations and are not clinically validated."
    )


class DincharyaRecommendationResponse(BaseModel):
    recommendations: Dict[str, TaskRecommendation]
    model: ModelInfo


class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool


def generate_recommendations(
    state: ServiceState,
    request: DincharyaRecommendationRequest,
) -> DincharyaRecommendationResponse:
    """
    Validate inputs, run model inference, and enrich predicted tasks with catalogue metadata.
    """
    if not state.bundle or not state.catalogue:
        raise RuntimeError("Service state is not initialized or model bundle is missing.")

    # 1. Normalize and validate Prakriti
    try:
        normalized_dosha = normalize_prakriti(request.primary_dosha)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid primary_dosha: {exc}",
        )

    # 2. Validate schedule and calculate derived features
    schedule = {
        "break_start": request.break_start,
        "break_end": request.break_end,
        "return_home_time": request.return_home_time,
        "sleep_time": request.sleep_time,
        "wake_time": request.wake_time,
    }

    try:
        validate_user_schedule(schedule)
        derived = calculate_derived_features(schedule)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=f"Invalid schedule input: {exc}",
        )

    # 3. Model inference
    model_input = {
        "primary_dosha": normalized_dosha,
        **schedule,
        **derived,
    }

    raw_predictions = predict_tasks(state.bundle, model_input)

    # 4. Enrich and verify recommendations against catalogue
    recommendations: Dict[str, TaskRecommendation] = {}
    for category in CATEGORIES:
        if category not in raw_predictions:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Model failed to generate prediction for category '{category}'.",
            )
        task_id = raw_predictions[category]
        if task_id not in state.tasks_by_id:
            logger.error(f"Model predicted unknown task_id '{task_id}' for category '{category}'.")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal error: Model generated an unrecognized task identifier.",
            )

        task_data = state.tasks_by_id[task_id]
        if task_data.get("category") != category:
            logger.error(
                f"Model category mismatch: Task '{task_id}' belongs to '{task_data.get('category')}', "
                f"expected '{category}'."
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal error: Recommendation category mismatch.",
            )

        recommendations[category] = TaskRecommendation(
            task_id=task_data["task_id"],
            title=task_data["title"],
            description=task_data.get("description", ""),
            duration_minutes=task_data.get("duration_minutes", 0),
            safety_restrictions=task_data.get("safety_restrictions", []),
            ayurvedic_principle=task_data.get("ayurvedic_principle", ""),
        )

    model_info = ModelInfo(
        scikit_learn_version=state.bundle.get("sklearn_version", sklearn.__version__)
    )

    return DincharyaRecommendationResponse(
        recommendations=recommendations,
        model=model_info,
    )


def create_app(
    model_path: Optional[Path] = None,
    catalogue_path: Optional[Path] = None,
    preloaded_state: Optional["ServiceState"] = None,
) -> FastAPI:
    """FastAPI application factory.

    Parameters
    ----------
    model_path:
        Path to the joblib model bundle. Resolved via env var or default when *None*.
    catalogue_path:
        Path to the task catalogue JSON. Resolved via env var or default when *None*.
    preloaded_state:
        A ``ServiceState`` whose ``load_artifacts()`` has already been called.
        When provided, the lifespan startup step is skipped (useful for testing).
    """
    if preloaded_state is not None:
        service_state = preloaded_state
        skip_startup = True
    else:
        service_state = ServiceState(model_path=model_path, catalogue_path=catalogue_path)
        skip_startup = False

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
        if not skip_startup:
            try:
                # Run blocking I/O (joblib model load) in a thread to avoid
                # deadlocking the asyncio event loop on Windows.
                await asyncio.to_thread(service_state.load_artifacts)
                logger.info("Dincharya Recommendation Service started successfully.")
            except Exception as exc:
                logger.error(f"Service startup failed: {exc}")
                raise
        else:
            logger.info("Dincharya Recommendation Service started with pre-loaded state.")
        app.state.service_state = service_state
        yield

    app = FastAPI(
        title="Manoswaasth Dincharya Recommendation API",
        version="1.0.0",
        description="Predicts personalised Ayurvedic daily rituals adapted to modern schedules.",
        lifespan=lifespan,
    )

    app.state.service_state = service_state

    # Custom exception handlers for clean error JSON formatting
    @app.exception_handler(RequestValidationError)
    async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        error_msg = "; ".join(f"{'.'.join(str(l) for l in err['loc'])}: {err['msg']}" for err in errors)
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            content={"ok": False, "error": f"Validation error: {error_msg}", "details": errors},
        )

    @app.exception_handler(HTTPException)
    async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"ok": False, "error": exc.detail},
        )

    @app.get(
        "/health",
        response_model=HealthResponse,
        summary="Service readiness check",
    )
    def health_check() -> HealthResponse:
        is_ready = (
            service_state.bundle is not None
            and service_state.catalogue is not None
            and len(service_state.tasks_by_id) == 35
        )
        return HealthResponse(
            status="ok" if is_ready else "not_ready",
            service="dincharya-recommendation-api",
            model_loaded=is_ready,
        )

    @app.post(
        "/recommend",
        response_model=DincharyaRecommendationResponse,
        summary="Predict Dincharya recommendations across all 4 categories",
    )
    def recommend(request: DincharyaRecommendationRequest) -> DincharyaRecommendationResponse:
        return generate_recommendations(service_state, request)

    return app


# Default application instance
app = create_app()

