"""The Populife sidebar panel: the safe, its passcodes and its activity in one place.

The panel's JavaScript ships in the integration (built from `frontend/` in the repository) and
is served by Home Assistant itself, so there's nothing to install separately.
"""

from __future__ import annotations

from pathlib import Path
from typing import TYPE_CHECKING, Final

from homeassistant.components.http.server import StaticPathConfig

from .const import DOMAIN

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant

PANEL_URL_PATH: Final = DOMAIN
PANEL_ELEMENT: Final = "populife-panel"
PANEL_TITLE: Final = "Safe"
PANEL_ICON: Final = "mdi:safe-square-outline"
STATIC_URL: Final = f"/{DOMAIN}_static"
PANEL_FILE: Final = Path(__file__).parent / "frontend" / "populife-panel.js"
DATA_PANEL: Final = f"{DOMAIN}_panel"


async def async_register_static(hass: HomeAssistant) -> None:
    """Serve the panel's JavaScript; done once, as static paths can't be removed."""
    await hass.http.async_register_static_paths(
        [StaticPathConfig(STATIC_URL, str(PANEL_FILE.parent), cache_headers=False)]
    )


async def async_add_panel(hass: HomeAssistant, version: str) -> None:
    """Add the sidebar panel, once, when Home Assistant's frontend is running."""
    if hass.data.get(DATA_PANEL) or "frontend" not in hass.config.components:
        return
    from homeassistant.components import panel_custom  # noqa: PLC0415 - after_dependencies

    await panel_custom.async_register_panel(
        hass,
        frontend_url_path=PANEL_URL_PATH,
        webcomponent_name=PANEL_ELEMENT,
        sidebar_title=PANEL_TITLE,
        sidebar_icon=PANEL_ICON,
        # The version busts the browser cache after every update.
        module_url=f"{STATIC_URL}/{PANEL_FILE.name}?v={version}",
        # Allowed non-admin users use it too; it shows nothing to anyone else.
        require_admin=False,
    )
    hass.data[DATA_PANEL] = True


def async_remove_panel(hass: HomeAssistant) -> None:
    """Remove the sidebar panel when the last safe is unloaded."""
    if not hass.data.pop(DATA_PANEL, False):
        return
    from homeassistant.components import frontend  # noqa: PLC0415 - after_dependencies

    frontend.async_remove_panel(hass, PANEL_URL_PATH)
