"""Lock entity for a Populife safe."""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, override

from ttlock_ble import LockState

from homeassistant.components.lock import LockEntity

from .entity import PopulifeEntity

if TYPE_CHECKING:
    from homeassistant.core import HomeAssistant
    from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback

    from .coordinator import PopulifeConfigEntry

# Commands run one at a time through the coordinator's lock.
PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: PopulifeConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Set up the lock entity."""
    async_add_entities([PopulifeLock(entry.runtime_data, "lock")])


class PopulifeLock(PopulifeEntity, LockEntity):
    """The safe's bolt."""

    _attr_name = None

    @property
    @override
    def is_locked(self) -> bool | None:
        """Return True when the bolt is thrown, None until it has been seen."""
        if (state := self.coordinator.state.lock_state) is None:
            return None
        return state is LockState.LOCKED

    @property
    @override
    def is_locking(self) -> bool:
        """Return True while a lock command is in flight."""
        return self.coordinator.state.is_locking

    @property
    @override
    def is_unlocking(self) -> bool:
        """Return True while an unlock command is in flight."""
        return self.coordinator.state.is_unlocking

    @override
    async def async_lock(self, **kwargs: Any) -> None:
        """Lock the safe."""
        await self.coordinator.async_lock()

    @override
    async def async_unlock(self, **kwargs: Any) -> None:
        """Unlock the safe."""
        await self.coordinator.async_unlock()
