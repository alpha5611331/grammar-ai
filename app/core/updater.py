from __future__ import annotations

import json
import os
import platform
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path
from typing import Callable, Optional

from loguru import logger

from app.config import EXE_OLD_SUFFIX, RELEASES_API


def _get_platform_tag() -> str:
    machine = platform.machine().lower()
    arch = "x64" if machine in ("amd64", "x86_64") else machine
    if sys.platform == "win32":
        return f"windows-{arch}"
    if sys.platform == "darwin":
        return f"macos-{arch}"
    return f"linux-{arch}"


def get_current_exe() -> Optional[Path]:
    """Returns the running .exe path; None when running as a plain Python script."""
    if not getattr(sys, "frozen", False):
        logger.debug("Not running as frozen executable; skipping exe name check")
        return None
    exe = Path(sys.executable)
    if exe.exists():
        return exe
    renamed = exe.parent / "grammar-ai.exe"
    if renamed.exists():
        return renamed
    return exe


def cleanup_old_files() -> None:
    """Delete any *-old.exe left over from a previous update mechanism."""
    exe = get_current_exe()
    if exe is None:
        logger.debug("Not running as frozen executable; skipping old file cleanup")
        return
    for f in exe.parent.glob(f"*{EXE_OLD_SUFFIX}{exe.suffix}"):
        try:
            f.unlink()
        except OSError as e:
            logger.debug(f"Could not delete old exe {f.name}: {e}")


def _parse_version(v: str) -> tuple[int, ...]:
    try:
        return tuple(int(x) for x in v.lstrip("v").split("."))
    except ValueError:
        return (0,)


def check_for_update(current_version: str) -> Optional[tuple[str, str]]:
    """
    Returns (new_version, download_url) if a newer release with a matching
    platform asset exists, otherwise None.
    """
    try:
        req = urllib.request.Request(
            RELEASES_API,
            headers={
                "Accept": "application/vnd.github+json",
                "User-Agent": "grammar-ai-updater",
            },
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode())

        latest = data.get("tag_name", "").lstrip("v")
        if not latest or _parse_version(latest) <= _parse_version(current_version):
            return None

        platform_tag = _get_platform_tag()
        for asset in data.get("assets", []):
            name: str = asset.get("name", "")
            if platform_tag in name:
                return latest, asset["browser_download_url"]
    except Exception as e:
        logger.warning(f"Update check failed: {e}")
    return None


def download_update(
    url: str,
    on_progress: Optional[Callable[[int], None]] = None,
) -> Optional[Path]:
    """
    Download the update asset to the system temp directory.
    on_progress is called with an integer 0-100.
    Returns the destination path on success, None on failure.
    """
    exe = get_current_exe()
    if exe is None:
        return None

    filename = url.rsplit("/", 1)[-1]
    # Download to %TEMP%, not next to the running exe — avoids the AV heuristic
    # of writing a new executable into the same directory as the running process.
    dest = Path(tempfile.gettempdir()) / filename

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "grammar-ai-updater"})
        with urllib.request.urlopen(req, timeout=120) as resp:
            total = int(resp.headers.get("Content-Length", 0))
            downloaded = 0
            with open(dest, "wb") as f:
                while True:
                    chunk = resp.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if on_progress and total:
                        on_progress(int(downloaded * 100 / total))
        return dest
    except Exception as e:
        logger.warning(f"Download failed from {url}: {e}")
        try:
            dest.unlink(missing_ok=True)
        except OSError as oe:
            logger.debug(f"Could not remove partial download {dest.name}: {oe}")
        return None


def apply_update(new_exe: Path) -> bool:
    """
    Hand the update off to a temporary batch script that runs after this process
    exits: it waits for the PID to disappear, moves the new exe into place, then
    relaunches it.  The app never self-renames or directly executes a downloaded
    binary, which eliminates the AV heuristics that trigger false positives.
    Returns True on success; the caller must exit the process afterwards.
    """
    exe = get_current_exe()
    if exe is None:
        logger.debug("Not running as frozen executable; skipping update application")
        return False

    pid = os.getpid()
    bat = Path(tempfile.gettempdir()) / "grammar_ai_update.bat"
    script = (
        "@echo off\n"
        ":wait\n"
        f'tasklist /FI "PID eq {pid}" 2>NUL | find " {pid} " >NUL\n'
        "if not errorlevel 1 (\n"
        "    timeout /t 1 /nobreak >NUL\n"
        "    goto :wait\n"
        ")\n"
        f'move /Y "{new_exe}" "{exe}"\n'
        f'start "" "{exe}"\n'
        'del "%~f0"\n'
    )
    try:
        bat.write_text(script, encoding="utf-8")
        subprocess.Popen(
            ["cmd.exe", "/C", str(bat)],
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        logger.info(f"Update script launched for {exe.name}; exiting for handoff")
        return True
    except Exception as e:
        logger.error(f"Failed to launch update script: {e}")
        try:
            bat.unlink(missing_ok=True)
        except OSError:
            pass
        return False
