"""
Server Entry Point for Manoswaasth Dincharya Recommendation API (Phase 3).

Run from repository root:
    python manoswaasth-ml/src/serve.py --host 127.0.0.1 --port 8000
"""

import argparse
import os
from pathlib import Path
import sys

import uvicorn

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
if str(PACKAGE_ROOT) not in sys.path:
    sys.path.insert(0, str(PACKAGE_ROOT))

from src.api import DEFAULT_CATALOGUE_PATH, DEFAULT_MODEL_PATH


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run the Manoswaasth Dincharya Recommendation HTTP inference service."
    )
    parser.add_argument(
        "--host",
        type=str,
        default=os.getenv("DINCHARYA_HOST", "127.0.0.1"),
        help="Host address to bind the service (default: 127.0.0.1)",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.getenv("DINCHARYA_PORT", "8000")),
        help="Port to bind the service (default: 8000)",
    )
    parser.add_argument(
        "--model",
        type=Path,
        default=Path(os.getenv("DINCHARYA_MODEL_PATH", str(DEFAULT_MODEL_PATH))),
        help=f"Path to model bundle artifact (default: {DEFAULT_MODEL_PATH})",
    )
    parser.add_argument(
        "--catalogue",
        type=Path,
        default=Path(os.getenv("DINCHARYA_CATALOGUE_PATH", str(DEFAULT_CATALOGUE_PATH))),
        help=f"Path to task catalogue JSON (default: {DEFAULT_CATALOGUE_PATH})",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Enable uvicorn auto-reload for development",
    )

    args = parser.parse_args()

    # Pass paths to environment for the FastAPI factory
    os.environ["DINCHARYA_MODEL_PATH"] = str(args.model.resolve())
    os.environ["DINCHARYA_CATALOGUE_PATH"] = str(args.catalogue.resolve())

    print("=" * 80)
    print("STARTING MANOSWAASTH DINCHARYA INFERENCE SERVICE (PHASE 3)")
    print("=" * 80)
    print(f"Host       : {args.host}")
    print(f"Port       : {args.port}")
    print(f"Model path : {args.model}")
    print(f"Catalogue  : {args.catalogue}")
    print(f"Docs URL   : http://{args.host}:{args.port}/docs")
    print(f"Health URL : http://{args.host}:{args.port}/health")
    print("=" * 80)

    uvicorn.run(
        "src.api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()

