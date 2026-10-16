"""Tests for the Populife integration."""

from __future__ import annotations

import base64
import time

from bleak.backends.device import BLEDevice
from bleak.backends.scanner import AdvertisementData
from ttlock_ble import LockVersion, VirtualKey
from ttlock_ble.crypto import _DECODE_TABLE

from homeassistant.components.bluetooth import (
    BluetoothServiceInfoBleak,
    async_get_advertisement_callback,
)
from homeassistant.const import CONF_ADDRESS
from homeassistant.core import HomeAssistant

from custom_components.populife.const import CONF_KEY

ADDRESS = "AA:BB:CC:DD:EE:FF"
NAME = "S31_eeff"
TTLOCK_SERVICE_UUID = "00001910-0000-1000-8000-00805f9b34fb"

FLAG_UNLOCKED = 0x01
FLAG_DORMANT = 0x10


def manufacturer_data(
    *, flags: int = 0, battery: int = 87, address: str = ADDRESS
) -> dict[int, bytes]:
    """Build the manufacturer data a V3 TTLock safe advertises."""
    raw = (
        bytes([5, 3, 2, flags, battery]) + bytes(4) + bytes.fromhex(address.replace(":", ""))[::-1]
    )
    return {int.from_bytes(raw[:2], "little"): raw[2:]}


def service_info(
    *,
    flags: int = 0,
    battery: int = 87,
    rssi: int = -60,
    address: str = ADDRESS,
    name: str = NAME,
    mfr_data: dict[int, bytes] | None = None,
) -> BluetoothServiceInfoBleak:
    """Build a connectable advertisement from the safe."""
    data = (
        mfr_data
        if mfr_data is not None
        else manufacturer_data(flags=flags, battery=battery, address=address)
    )
    return BluetoothServiceInfoBleak(
        name=name,
        address=address,
        rssi=rssi,
        manufacturer_data=data,
        service_data={},
        service_uuids=[TTLOCK_SERVICE_UUID],
        source="local",
        device=BLEDevice(address, name, {}),
        advertisement=AdvertisementData(
            local_name=name,
            manufacturer_data=data,
            service_data={},
            service_uuids=[TTLOCK_SERVICE_UUID],
            tx_power=None,
            rssi=rssi,
            platform_data=(),
        ),
        connectable=True,
        time=time.monotonic(),
        tx_power=None,
    )


def inject(hass: HomeAssistant, info: BluetoothServiceInfoBleak) -> None:
    """Feed an advertisement to the Bluetooth manager."""
    async_get_advertisement_callback(hass)(info)


def make_key(*, admin: bool = False, address: str = ADDRESS) -> VirtualKey:
    """Return a key for the test safe."""
    return VirtualKey(
        keyId=11,
        lockId=22,
        lockMac=address,
        lockAlias="Office safe",
        lockName=NAME,
        lockVersion=LockVersion(protocolType=5, protocolVersion=3, scene=2, groupId=1, orgId=1),
        aesKeyStr="00112233445566778899aabbccddeeff",
        unlockKey="123456789",
        lockFlagPos=0,
        timezoneRawOffSet=0,
        userType="110301" if admin else "110302",
        adminPs="987654321" if admin else "",
        uid=42,
    )


ENTRY_DATA = {CONF_ADDRESS: ADDRESS, CONF_KEY: make_key(admin=True).to_dict()}


def cloud_encode(secret: str, xor_const: int = 0x5A) -> str:
    """Encode `secret` the way the cloud sync encodes lockKey / adminPwd."""
    payload = [byte ^ xor_const for byte in secret.encode("ascii")]
    payload.append(_DECODE_TABLE[len(payload) % 256] ^ xor_const)
    return base64.b64encode(",".join(map(str, payload)).encode("ascii")).decode("ascii")
