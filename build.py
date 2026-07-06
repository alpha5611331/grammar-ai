#!/usr/bin/env python3
"""Build script for Grammar AI using PyInstaller (onedir mode)."""

import argparse
import subprocess
import sys
import tomllib
from pathlib import Path


def get_project_version(pyproject_path: Path) -> str:
    with pyproject_path.open("rb") as handle:
        project = tomllib.load(handle)
    return project["project"]["version"]


def _make_ico(png_path: Path, ico_path: Path) -> None:
    """Convert PNG to a multi-resolution ICO using Pillow."""
    from PIL import Image

    img = Image.open(png_path).convert("RGBA")
    img.save(
        ico_path,
        format="ICO",
        sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)],
    )


def _build_frontend(frontend_dir: Path) -> int:
    """Build the React UI (frontend/) into app/ui/webview/web via `pnpm build`.

    shell=True is needed on Windows: pnpm is a .cmd/.ps1 shim, and subprocess won't
    resolve that without going through the shell.
    """
    print("Building frontend (pnpm install && pnpm build)...")
    install = subprocess.run("pnpm install --frozen-lockfile", cwd=frontend_dir, shell=True)
    if install.returncode != 0:
        return install.returncode
    result = subprocess.run("pnpm build", cwd=frontend_dir, shell=True)
    return result.returncode


def build_exe(debug: bool = False) -> int:
    """Build Grammar AI as a PyInstaller onedir distribution."""
    root = Path(__file__).parent
    build_dir = root / "build"
    build_dir.mkdir(exist_ok=True)

    frontend_rc = _build_frontend(root / "frontend")
    if frontend_rc != 0:
        return frontend_rc

    version = get_project_version(root / "pyproject.toml")

    sep = ";" if sys.platform.startswith("win") else ":"

    args = [
        sys.executable,
        "-m",
        "PyInstaller",
        "--onedir",
        "--noconfirm",
        "--clean",
        f"--distpath={build_dir}",
        f"--workpath={build_dir / '_work'}",
        f"--specpath={build_dir}",
        "--name=grammar-ai",
        f"--add-data={root / 'pyproject.toml'}{sep}.",
        f"--add-data={root / 'resources' / 'icon.png'}{sep}resources",
        f"--add-data={root / 'app' / 'ui' / 'webview' / 'web'}{sep}app/ui/webview/web",
        "--collect-all=openai",
        "--collect-all=httpx",
        "--collect-all=pystray",
        "--exclude-module=openai.helpers",
    ]

    if sys.platform.startswith("win"):
        ico_path = root / "resources" / "icon.ico"
        _make_ico(root / "resources" / "icon.png", ico_path)
        args.append(f"--icon={ico_path}")
        if not debug:
            args.append("--noconsole")

    args.append("main.py")

    print(f"Building Grammar AI v{version} with PyInstaller...")
    print(f"Output: {build_dir / 'grammar-ai'}")
    result = subprocess.run(args, cwd=root)
    return result.returncode


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Build Grammar AI executable")
    parser.add_argument(
        "--debug", action="store_true", help="Build with console window for debugging"
    )
    args = parser.parse_args()
    sys.exit(build_exe(debug=args.debug))
