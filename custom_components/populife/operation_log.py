"""Turn the safe's operation-log records into Home Assistant friendly operations."""

from __future__ import annotations

from dataclasses import dataclass
from typing import TYPE_CHECKING, Final

from ttlock_ble import LogOperate

from homeassistant.util import dt as dt_util

if TYPE_CHECKING:
    from collections.abc import Callable
    import datetime as dt

    from ttlock_ble import LogEntry

# How the safe was operated: the event types of the operation event entity and the options of
# the last-unlock-method sensor.
METHOD_APP: Final = "app"
METHOD_KEYPAD: Final = "keypad"
METHOD_FINGERPRINT: Final = "fingerprint"
METHOD_CARD: Final = "card"
METHOD_KEY: Final = "key"
METHOD_GATEWAY: Final = "gateway"
METHOD_REMOTE: Final = "remote"
METHOD_FAILED: Final = "failed"
METHOD_ALARM: Final = "alarm"
METHOD_OTHER: Final = "other"
METHODS: Final = (
    METHOD_APP,
    METHOD_KEYPAD,
    METHOD_FINGERPRINT,
    METHOD_CARD,
    METHOD_KEY,
    METHOD_GATEWAY,
    METHOD_REMOTE,
    METHOD_FAILED,
    METHOD_ALARM,
    METHOD_OTHER,
)
UNLOCK_METHODS: Final = tuple(
    m for m in METHODS if m not in (METHOD_FAILED, METHOD_ALARM, METHOD_OTHER)
)

ACTION_UNLOCK: Final = "unlock"
ACTION_LOCK: Final = "lock"
ACTION_OTHER: Final = "other"

_UNLOCKS: Final[dict[int, str]] = {
    LogOperate.MOBILE_UNLOCK: METHOD_APP,
    LogOperate.SERVER_UNLOCK: METHOD_APP,
    LogOperate.APP_AUTH_KEY_UNLOCK_SUCCESS: METHOD_APP,
    LogOperate.DOUBLE_CHECK_KEY_UNLOCK: METHOD_APP,
    LogOperate.KEYBOARD_PASSWORD_UNLOCK: METHOD_KEYPAD,
    LogOperate.DOUBLE_CHECK_PASSCODE_UNLOCK: METHOD_KEYPAD,
    LogOperate.FR_UNLOCK_SUCCEED: METHOD_FINGERPRINT,
    LogOperate.DOUBLE_CHECK_FINGER_PRINT_UNLOCK: METHOD_FINGERPRINT,
    LogOperate.IC_UNLOCK_SUCCEED: METHOD_CARD,
    LogOperate.DOUBLE_CHECK_CARD_UNLOCK: METHOD_CARD,
    LogOperate.OPERATE_KEY_UNLOCK: METHOD_KEY,
    LogOperate.GATEWAY_UNLOCK: METHOD_GATEWAY,
    LogOperate.GATEWAY_AUTH_KEY_UNLOCK_SUCCESS: METHOD_GATEWAY,
    LogOperate.REMOTE_CONTROL_KEY: METHOD_REMOTE,
    LogOperate.WIRELESS_KEY_FOB: METHOD_REMOTE,
    LogOperate.WIRELESS_KEY_PAD: METHOD_REMOTE,
    LogOperate.DOUBLE_CHECK_KEY_FOB_UNLOCK: METHOD_REMOTE,
}
_LOCKS: Final[dict[int, str]] = {
    LogOperate.OPERATE_BLE_LOCK: METHOD_APP,
    LogOperate.APP_DEAD_LOCK: METHOD_APP,
    LogOperate.PASSCODE_LOCK: METHOD_KEYPAD,
    LogOperate.FR_LOCK: METHOD_FINGERPRINT,
    LogOperate.IC_LOCK: METHOD_CARD,
    LogOperate.OPERATE_KEY_LOCK: METHOD_KEY,
}
_ALARMS: Final = frozenset({LogOperate.ILLEGAL_UNLOCK, LogOperate.DOOR_NOT_CLOSE_ALARM})
# Credentials that are safe to show: fingerprint and card ids. Keypad codes never leave here.
_SHOW_CREDENTIAL: Final = frozenset({METHOD_FINGERPRINT, METHOD_CARD})


@dataclass(frozen=True, slots=True)
class Operation:
    """One operation-log record, described for Home Assistant."""

    record_number: int
    method: str
    action: str
    record_type: str
    time: dt.datetime | None
    battery: int
    credential: str | None
    # The name Home Assistant keeps for the keypad code used, never the code itself.
    user: str | None = None

    def as_event_data(self) -> dict[str, str | int | None]:
        """Return the attributes of the event fired for this operation."""
        return {
            "action": self.action,
            "record_type": self.record_type,
            "time": self.time.isoformat() if self.time else None,
            "battery": self.battery,
            "credential": self.credential,
            "user": self.user,
        }


def _record_type_name(record_type: int) -> str:
    try:
        return LogOperate(record_type).name.lower()
    except ValueError:
        return f"unknown_{record_type}"


def describe(
    entry: LogEntry, name_of: Callable[[str | None], str | None] | None = None
) -> Operation:
    """Return how and what was done in `entry`, with its time in Home Assistant's zone.

    `name_of` maps a keypad code to the name Home Assistant keeps for it.
    """
    record_type = int(entry.record_type)
    name = _record_type_name(record_type)
    if record_type in _UNLOCKS:
        method, action = _UNLOCKS[record_type], ACTION_UNLOCK
    elif record_type in _LOCKS:
        method, action = _LOCKS[record_type], ACTION_LOCK
    elif record_type in _ALARMS:
        method, action = METHOD_ALARM, ACTION_OTHER
    elif "failed" in name or record_type == LogOperate.ERROR_PASSWORD_UNLOCK:
        method, action = METHOD_FAILED, ACTION_OTHER
    else:
        method, action = METHOD_OTHER, ACTION_OTHER
    # The safe's clock has no time zone; it runs on local time (see the sync clock button).
    time = (
        entry.operate_date.replace(tzinfo=dt_util.get_default_time_zone())
        if entry.operate_date
        else None
    )
    return Operation(
        record_number=entry.record_number,
        method=method,
        action=action,
        record_type=name,
        time=time,
        battery=entry.lock_battery,
        credential=entry.password if method in _SHOW_CREDENTIAL else None,
        user=name_of(entry.password) if name_of and method == METHOD_KEYPAD else None,
    )
