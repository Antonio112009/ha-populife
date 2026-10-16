"""Fail when the dev-dependency pins drift from what a real install uses.

The tests should run on exactly the libraries a real Home Assistant install uses:
- Libraries Home Assistant pins: this walks the integration's manifest dependencies through
  Home Assistant's own component manifests (for example bluetooth_adapters -> bluetooth -> usb)
  and compares their `name==version` requirements with pyproject.toml's dev group.
- The integration's own requirements (manifest.json `requirements`, what HACS users get
  installed) must match the dev pins too, so a dependency bump updates both.

Usage:
    uv run python scripts/check_ha_pins.py
"""

from __future__ import annotations

from importlib.metadata import version
import json
from pathlib import Path
import re
import sys
import tomllib

import homeassistant

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "custom_components" / "populife" / "manifest.json"
HA_COMPONENTS = Path(homeassistant.__file__).parent / "components"
PIN = re.compile(r"^([A-Za-z0-9._-]+)==([^;\s]+)")


def normalize(name: str) -> str:
    """Return the PEP 503 normalized form of a package name."""
    return re.sub(r"[-_.]+", "-", name).lower()


def pins(requirements: list[str]) -> dict[str, str]:
    """Return {normalized name: version} for every exact `name==version` requirement."""
    return {
        normalize(match.group(1)): match.group(2)
        for requirement in requirements
        if (match := PIN.match(requirement.strip()))
    }


def home_assistant_pins() -> dict[str, str]:
    """Collect the pins of every Home Assistant component the integration depends on."""
    found: dict[str, str] = {}
    seen: set[str] = set()
    queue = list(json.loads(MANIFEST.read_text(encoding="utf-8")).get("dependencies", []))
    while queue:
        domain = queue.pop()
        if domain in seen:
            continue
        seen.add(domain)
        manifest = json.loads((HA_COMPONENTS / domain / "manifest.json").read_text("utf-8"))
        found |= pins(manifest.get("requirements", []))
        queue.extend(manifest.get("dependencies", []))
    return found


def main() -> None:
    """Compare the dev pins with Home Assistant's and report every mismatch."""
    project = tomllib.loads((ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    ours = pins(project["dependency-groups"]["dev"])
    ha_version = version("homeassistant")
    sources = {
        f"Home Assistant {ha_version} pins": home_assistant_pins(),
        "manifest.json requires": pins(
            json.loads(MANIFEST.read_text(encoding="utf-8")).get("requirements", [])
        ),
    }
    mismatches = [
        f"  {name}: pyproject.toml has {ours[name]}, {source} {theirs[name]}"
        for source, theirs in sources.items()
        for name in sorted(ours.keys() & theirs.keys())
        if ours[name] != theirs[name]
    ]
    if mismatches:
        sys.exit(
            "Dev pins drift from what a real install uses:\n"
            + "\n".join(mismatches)
            + "\nAlign pyproject.toml (and manifest.json for runtime requirements), "
            "then run `uv lock`."
        )
    checked = sum(len(ours.keys() & theirs.keys()) for theirs in sources.values())
    print(f"{checked} pins match Home Assistant {ha_version} and manifest.json.")  # noqa: T201


if __name__ == "__main__":
    main()
