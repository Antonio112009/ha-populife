"""Tests for reading keys out of pasted app lock data."""

from __future__ import annotations

import json

import pytest
from ttlock_ble import LockVersion

from custom_components.populife.lock_data import LockDataError, decode_secret, key_from_lock_data

from . import ADDRESS, cloud_encode

FALLBACK = LockVersion(protocolType=5, protocolVersion=3, scene=2, groupId=1, orgId=1)
AES = "00112233445566778899aabbccddeeff"


def _parse(payload: object):
    return key_from_lock_data(
        json.dumps(payload), address=ADDRESS, fallback_version=FALLBACK, name="S8534"
    )


def test_ttlock_key_list() -> None:
    """A TTLock-style key list is searched for this safe; lockVersion may be a JSON string."""
    other = {"lockMac": "11:22:33:44:55:66", "aesKeyStr": AES, "lockKey": "1"}
    ours = {
        "lockMac": ADDRESS.lower(),
        "aesKeyStr": AES,
        "lockKey": "123456789",
        "lockFlagPos": "4",
        "lockVersion": json.dumps({"protocolType": 5, "protocolVersion": 3, "scene": 7}),
        "lockAlias": "Garage",
        "userType": "110301",
        "adminPs": "246810",
        "uid": 42,
    }
    key = _parse({"keyInfos": [other, ours]})
    assert key.lockMac == ADDRESS
    assert key.unlockKey == "123456789"
    assert key.lockFlagPos == 4
    assert key.lockVersion.scene == 7
    assert (key.lockVersion.groupId, key.lockVersion.orgId) == (1, 1)
    assert key.lockAlias == "Garage"
    assert key.is_admin()
    assert key.uid == 42


def test_populife_record_without_admin() -> None:
    """A shared key has no admin password, so it is not treated as an admin key."""
    key = _parse({"mac": ADDRESS, "aesKey": AES, "key": cloud_encode("13579"), "isAdmin": True})
    assert key.unlockKey == "13579"
    assert key.adminPs == ""
    assert not key.is_admin()
    assert key.lockVersion == FALLBACK
    assert key.lockAlias == "S8534"


def test_invalid_lock_version_string_falls_back() -> None:
    """A lockVersion that isn't JSON falls back to the record's own fields."""
    key = _parse(
        [{"mac": ADDRESS, "aesKey": AES, "key": "1", "lockVersion": "{bad", "groupId": "x"}]
    )
    assert key.lockVersion == FALLBACK


@pytest.mark.parametrize(
    ("record", "reason"),
    [
        ({"mac": ADDRESS, "aesKey": "zz", "key": "1"}, "invalid_aes_key"),
        ({"mac": ADDRESS, "aesKey": AES, "key": "nope!"}, "invalid_unlock_key"),
        (
            {"mac": ADDRESS, "aesKey": AES, "key": "1", "adminPwd": "nope!"},
            "invalid_admin_password",
        ),
    ],
)
def test_bad_secrets(record: dict[str, str], reason: str) -> None:
    """Each unusable secret has its own error."""
    with pytest.raises(LockDataError) as err:
        _parse({"data": record})
    assert err.value.reason == reason


def test_not_a_record() -> None:
    """A JSON scalar is not lock data."""
    with pytest.raises(LockDataError) as err:
        _parse(7)
    assert err.value.reason == "not_lock_data"


def test_decode_secret() -> None:
    """Digits pass through; encoded values are decoded; garbage is rejected."""
    assert decode_secret(" 123 ") == "123"
    assert decode_secret(cloud_encode("4455")) == "4455"
    assert decode_secret(cloud_encode("abc")) is None
    assert decode_secret("@@@@@@@@@@@@") is None
