"""Names for keypad passcodes, the passcode console's form, and code generation.

The safe stores a passcode's digits, type and validity, but no name. Home Assistant keeps the
name (who a permanent code belongs to, or what a temporary one is for) next to the code, so
the console can list codes by name and the operation log can say who opened the safe.
"""

from __future__ import annotations

from dataclasses import dataclass
import datetime as dt
import secrets
from typing import TYPE_CHECKING, Any, Final

from homeassistant.helpers.storage import Store
from homeassistant.util import dt as dt_util

from .const import DOMAIN

if TYPE_CHECKING:
    from collections.abc import Iterable

    from homeassistant.core import HomeAssistant

STORAGE_VERSION: Final = 1
# The keypad accepts 4 to 9 digits.
PASSCODE_MIN_LENGTH: Final = 4
PASSCODE_MAX_LENGTH: Final = 9
GENERATED_LENGTH: Final = 6
_GENERATE_ATTEMPTS: Final = 200

TYPE_PERMANENT: Final = "permanent"
TYPE_TIMED: Final = "timed"
PASSCODE_TYPES: Final = (TYPE_PERMANENT, TYPE_TIMED)


@dataclass(slots=True)
class PasscodeDraft:
    """What the console's form holds until "Add passcode" is pressed."""

    name: str = ""
    code: str = ""
    type: str = TYPE_PERMANENT
    start: dt.datetime | None = None
    end: dt.datetime | None = None
    delete_code: str | None = None

    def reset_window(self) -> None:
        """Default a temporary code to the next 24 hours, starting at the current minute."""
        now = dt_util.now().replace(second=0, microsecond=0)
        self.start = now
        self.end = now + dt.timedelta(days=1)


def conflicts(code: str, others: Iterable[str]) -> bool:
    """Return True when `code` equals or is a prefix of another code, or the other way round.

    The keypad accepts a code as soon as the digits typed so far match one, so "1234" would
    also open with "12345" and block it from ever being entered in full.
    """
    return any(code.startswith(other) or other.startswith(code) for other in others)


def mask(code: str) -> str:
    """Hide all but the last two digits of `code`."""
    return "*" * (len(code) - 2) + code[-2:]


def generate(others: Iterable[str], length: int = GENERATED_LENGTH) -> str:
    """Return a random code that doesn't clash with `others`."""
    taken = list(others)
    for _ in range(_GENERATE_ATTEMPTS):
        code = "".join(str(secrets.randbelow(10)) for _ in range(length))
        if not conflicts(code, taken):
            return code
    msg = "no free code"
    raise RuntimeError(msg)


class PasscodeBook:
    """Names and validity of the passcodes added through Home Assistant, kept across restarts."""

    def __init__(self, hass: HomeAssistant, entry_id: str) -> None:
        """Initialize the book; call `async_load` before use."""
        self._store: Store[dict[str, Any]] = Store(
            hass, STORAGE_VERSION, f"{DOMAIN}.{entry_id}.passcodes"
        )
        self._codes: dict[str, dict[str, str | None]] = {}

    async def async_load(self) -> None:
        """Read the stored names."""
        if (stored := await self._store.async_load()) is not None:
            self._codes = dict(stored.get("codes", {}))

    @property
    def codes(self) -> dict[str, dict[str, str | None]]:
        """Return {code: {name, type, start, end, created}}."""
        return self._codes

    def name(self, code: str | None) -> str | None:
        """Return the name given to `code`, if any."""
        if code is None or (entry := self._codes.get(code)) is None:
            return None
        return entry.get("name") or None

    async def async_add(
        self, code: str, name: str | None, start: dt.datetime | None, end: dt.datetime | None
    ) -> None:
        """Remember `code` with its name and validity."""
        self._codes[code] = {
            "name": name or None,
            "type": TYPE_TIMED if end is not None else TYPE_PERMANENT,
            "start": start.isoformat() if start else None,
            "end": end.isoformat() if end else None,
            "created": dt_util.now().isoformat(),
        }
        await self._async_save()

    async def async_remove(self, code: str) -> None:
        """Forget `code`."""
        if self._codes.pop(code, None) is not None:
            await self._async_save()

    async def async_clear(self) -> None:
        """Forget every code."""
        self._codes = {}
        await self._async_save()

    async def _async_save(self) -> None:
        await self._store.async_save({"codes": self._codes})
