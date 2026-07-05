#!/usr/bin/env python3
"""Linter script that runs ruff, mypy, and frontend lint/format checks."""

import subprocess
import sys
from pathlib import Path

_FRONTEND_DIR = Path(__file__).parent / "frontend"


def run_linter():
    """Run ruff check, mypy, and the frontend's prettier + oxlint on the project."""
    try:
        print("Running ruff format...")
        subprocess.run([sys.executable, "-m", "ruff", "format", "."], check=True)
        print("Ruff format passed.")
        print("Running ruff check...")
        subprocess.run([sys.executable, "-m", "ruff", "check", "--fix", "."], check=True)
        print("Ruff check passed.")
    except subprocess.CalledProcessError as e:
        print(f"Ruff check failed with exit code {e.returncode}")
        sys.exit(1)

    try:
        print("Running mypy...")
        subprocess.run([sys.executable, "-m", "mypy", "."], check=True)
        print("Mypy check passed.")
    except subprocess.CalledProcessError as e:
        print(f"Mypy check failed with exit code {e.returncode}")
        sys.exit(1)

    # shell=True is needed on Windows: pnpm is a .cmd/.ps1 shim, and subprocess won't
    # resolve that without going through the shell - same reasoning as build.py.
    try:
        print("Running prettier (frontend)...")
        subprocess.run("pnpm run format", cwd=_FRONTEND_DIR, shell=True, check=True)
        print("Prettier passed.")
        print("Running oxlint (frontend)...")
        subprocess.run("pnpm exec oxlint --fix", cwd=_FRONTEND_DIR, shell=True, check=True)
        print("Oxlint passed.")
    except subprocess.CalledProcessError as e:
        print(f"Frontend lint/format failed with exit code {e.returncode}")
        sys.exit(1)

    print("All linter checks passed!")


if __name__ == "__main__":
    run_linter()
