"""Bump or check the integration version.

The version in custom_components/populife/manifest.json is the single source of truth:
Home Assistant and HACS read it, and merging a new version into main publishes a release.

Usage:
    uv run python scripts/bump_version.py patch|minor|major|X.Y.Z
    uv run python scripts/bump_version.py --check BASE_VERSION
"""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import sys

MANIFEST = Path(__file__).resolve().parents[1] / "custom_components" / "populife" / "manifest.json"
SEMVER = re.compile(r"(\d+)\.(\d+)\.(\d+)")
VERSION_LINE = re.compile(r'("version":\s*")([^"]*)(")')
PARTS = ("major", "minor", "patch")


def parse(version: str) -> tuple[int, int, int]:
    """Return `version` as a (major, minor, patch) tuple."""
    if (match := SEMVER.fullmatch(version)) is None:
        sys.exit(f"Not an X.Y.Z version: {version!r}")
    major, minor, patch = (int(part) for part in match.groups())
    return major, minor, patch


def read_version() -> str:
    """Return the version currently in the manifest."""
    if (match := VERSION_LINE.search(MANIFEST.read_text(encoding="utf-8"))) is None:
        sys.exit(f"No version field in {MANIFEST}")
    return match.group(2)


def next_version(current: str, target: str) -> str:
    """Return the version after `current` for a part name, or `target` itself."""
    major, minor, patch = parse(current)
    if target == "major":
        return f"{major + 1}.0.0"
    if target == "minor":
        return f"{major}.{minor + 1}.0"
    if target == "patch":
        return f"{major}.{minor}.{patch + 1}"
    if parse(target) <= parse(current):
        sys.exit(f"{target} is not newer than the current version {current}")
    return target


def write_version(version: str) -> None:
    """Replace the manifest's version, leaving the rest of the file untouched."""
    text = MANIFEST.read_text(encoding="utf-8")
    MANIFEST.write_text(VERSION_LINE.sub(rf"\g<1>{version}\g<3>", text, count=1), encoding="utf-8")


def main() -> None:
    """Run the command line."""
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("target", nargs="?", help="major, minor, patch or an explicit X.Y.Z")
    group.add_argument("--check", metavar="BASE", help="fail unless the version is newer than BASE")
    args = parser.parse_args()

    current = read_version()
    if args.check is not None:
        if parse(current) <= parse(args.check):
            sys.exit(
                f"Version {current} is not newer than {args.check} on the base branch. "
                "Run: uv run python scripts/bump_version.py patch|minor|major"
            )
        print(f"Version bump OK: {args.check} -> {current}")  # noqa: T201
        return

    new = next_version(current, args.target)
    write_version(new)
    print(f"{current} -> {new}")  # noqa: T201


if __name__ == "__main__":
    main()
