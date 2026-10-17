"""Who may operate a safe: shared by the entities and the panel's websocket API."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from homeassistant.auth.permissions.const import POLICY_CONTROL
from homeassistant.exceptions import Unauthorized

from .const import CONF_ALLOWED_USERS, EVENT_ACCESS_DENIED

if TYPE_CHECKING:
    from homeassistant.auth.models import User
    from homeassistant.config_entries import ConfigEntry
    from homeassistant.core import Context, HomeAssistant

_LOGGER = logging.getLogger(__name__)


def user_may_operate(entry: ConfigEntry, user: User | None) -> bool:
    """Return True for admins and the users picked in the options.

    Home Assistant lets every user operate every entity, so the safe checks for itself.
    """
    if user is None:
        return False
    allowed: list[str] = entry.options.get(CONF_ALLOWED_USERS, [])
    return user.is_admin or user.id in allowed


async def async_check_access(
    hass: HomeAssistant, entry: ConfigEntry, context: Context | None, entity_id: str | None
) -> None:
    """Refuse the running action unless no user, an admin or an allowed user started it.

    Actions with no user behind them (automations, Home Assistant itself) pass. Anyone else
    gets Unauthorized, a warning in the log, and an access denied event.
    """
    if context is None or context.user_id is None:
        return
    user = await hass.auth.async_get_user(context.user_id)
    if user_may_operate(entry, user):
        return
    name = user.name if user is not None else None
    _LOGGER.warning(
        "%s: refused %s for %s, who may not operate the safe",
        entry.title,
        entity_id or "the panel",
        name or context.user_id,
    )
    hass.bus.async_fire(
        EVENT_ACCESS_DENIED,
        {"entity_id": entity_id, "user_id": context.user_id, "name": name},
        context=context,
    )
    raise Unauthorized(
        context=context,
        user_id=context.user_id,
        entity_id=entity_id,
        permission=POLICY_CONTROL,
    )
