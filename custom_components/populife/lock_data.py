"""Build a key from lock data the user copied out of the vendor app's sync response.

The Populife app receives each lock's Bluetooth secrets from its server; the response of its
lock-details request (or a TTLock-style key record) carries everything a key needs. Users paste
that JSON as-is, so this accepts the whole response, its `data` object, or a list of records,
with either Populife or TTLock field names.
"""

from __future__ import annotations

from collections.abc import Mapping
import json
from typing import Any

from ttlock_ble import LockVersion, VirtualKey
from ttlock_ble.crypto import decode_password, hex_key_to_bytes

ADMIN_USER_TYPE = "110301"

# Each key field and the names it goes by, Populife first, then TTLock.
_FIELDS: dict[str, tuple[str, ...]] = {
    "mac": ("mac", "lockMac"),
    "aes": ("aesKey", "aesKeyStr"),
    "unlock": ("key", "lockKey", "unlockKey"),
    "admin": ("adminPwd", "adminPs"),
    "flag_pos": ("flagPos", "lockFlagPos"),
}


class LockDataError(ValueError):
    """Raised with a config-flow error key when pasted lock data cannot be used."""

    def __init__(self, reason: str) -> None:
        """Keep the translation key of the problem as `reason`."""
        super().__init__(reason)
        self.reason = reason


def decode_secret(value: str) -> str | None:
    """Return a numeric key from plain digits or the cloud's encoded form, else None.

    The app's sync data carries `lockKey` and `adminPwd` encoded (base64 of a
    comma-separated byte list); the lock expects the decoded digits.
    """
    value = value.strip()
    if value.isdigit():
        return value
    try:
        decoded = decode_password(value)
    except ValueError:
        return None
    return decoded if decoded.isdigit() else None


def _first(record: Mapping[str, Any], field: str) -> object:
    for name in _FIELDS[field]:
        if record.get(name) not in (None, ""):
            return record[name]
    return None


def _int(value: object, default: int = 0) -> int:
    try:
        return int(str(value))
    except ValueError:
        return default


def _records(payload: object) -> list[Mapping[str, Any]]:
    """Return every candidate lock record in `payload`, unwrapping response envelopes."""
    if isinstance(payload, list):
        return [record for item in payload for record in _records(item)]
    if not isinstance(payload, Mapping):
        return []
    if _first(payload, "aes") is not None:
        return [payload]
    found: list[Mapping[str, Any]] = []
    for name in ("data", "keyInfos", "keyList", "list"):
        if name in payload:
            found.extend(_records(payload[name]))
    return found


def _lock_version(record: Mapping[str, Any], fallback: LockVersion) -> LockVersion:
    """Read the firmware ids from a nested `lockVersion` (object or JSON string) or the record."""
    raw = record.get("lockVersion")
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except ValueError:
            raw = None
    source: Mapping[str, Any] = raw if isinstance(raw, Mapping) else record
    return LockVersion(
        protocolType=_int(source.get("protocolType"), fallback.protocolType),
        protocolVersion=_int(source.get("protocolVersion"), fallback.protocolVersion),
        scene=_int(source.get("scene"), fallback.scene),
        groupId=_int(source.get("groupId"), fallback.groupId),
        orgId=_int(source.get("orgId"), fallback.orgId),
    )


def key_from_lock_data(
    text: str, *, address: str, fallback_version: LockVersion, name: str
) -> VirtualKey:
    """Return the key for the safe at `address` from pasted lock data.

    Raises `LockDataError` with the config-flow error key when the text is not
    JSON, holds no lock record, belongs to another safe, or has unusable secrets.
    """
    try:
        payload = json.loads(text)
    except ValueError as err:
        raise LockDataError("invalid_json") from err
    records = _records(payload)
    if not records:
        raise LockDataError("not_lock_data")
    record = next(
        (r for r in records if str(_first(r, "mac") or "").upper() == address.upper()),
        None,
    )
    if record is None:
        raise LockDataError("wrong_safe")

    aes_key = str(_first(record, "aes") or "").strip()
    try:
        hex_key_to_bytes(aes_key)
    except ValueError as err:
        raise LockDataError("invalid_aes_key") from err
    if (unlock_key := decode_secret(str(_first(record, "unlock") or ""))) is None:
        raise LockDataError("invalid_unlock_key")
    admin_raw = str(_first(record, "admin") or "")
    admin_password = decode_secret(admin_raw) if admin_raw else ""
    if admin_password is None:
        raise LockDataError("invalid_admin_password")

    is_admin = bool(record.get("isAdmin")) or str(record.get("userType")) == ADMIN_USER_TYPE
    alias = str(record.get("alias") or record.get("lockAlias") or "")
    lock_name = str(record.get("name") or record.get("lockName") or name)
    return VirtualKey(
        keyId=_int(record.get("keyId")),
        lockId=_int(record.get("lockId")),
        lockMac=address.upper(),
        lockAlias=alias or lock_name,
        lockName=lock_name,
        lockVersion=_lock_version(record, fallback_version),
        aesKeyStr=aes_key,
        unlockKey=unlock_key,
        lockFlagPos=_int(_first(record, "flag_pos")),
        timezoneRawOffSet=_int(record.get("timezoneRawOffSet")),
        startTime=_int(record.get("startDate")),
        endTime=_int(record.get("endDate")),
        keyType=_int(record.get("keyType")),
        userType=ADMIN_USER_TYPE if is_admin and admin_password else "",
        adminPs=admin_password,
        keyboardPwdVersion=_int(record.get("keyboardPwdVersion")),
        specialValue=_int(record.get("specialValue")),
        featureValue=str(record.get("featureValue") or ""),
        uid=_int(record.get("uid") or record.get("openid")),
    )
