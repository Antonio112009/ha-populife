"""Constants for the Populife integration."""

from __future__ import annotations

from typing import Final

DOMAIN: Final = "populife"
MANUFACTURER: Final = "Populife"

# Config entry data keys.
CONF_KEY: Final = "key"
CONF_AES_KEY: Final = "aes_key"
CONF_UNLOCK_KEY: Final = "unlock_key"
CONF_ADMIN_PASSWORD: Final = "admin_password"
CONF_VERIFICATION_CODE: Final = "verification_code"
CONF_BACK: Final = "back"
CONF_FLAG_POS: Final = "flag_pos"
CONF_GROUP_ID: Final = "group_id"
CONF_LOCK_DATA: Final = "lock_data"
CONF_ORG_ID: Final = "org_id"

# Frame header defaults for V3 firmware when the key is entered by hand; the
# cloud supplies the real values when keys are imported from an account.
DEFAULT_GROUP_ID: Final = 1
DEFAULT_ORG_ID: Final = 1

# The TTLock cloud returns this when the account has never been used from
# this install id and wants an emailed/SMS confirmation code first.
ERR_NEW_DEVICE_LOGIN: Final = -1014

# How long the BLE link stays open after a command so pushed events (keypad,
# fingerprint, re-latch) still reach us, and when we drop it to free the
# adapter / proxy slot for other devices.
KEEP_ALIVE_SECONDS: Final = 10.0
DISCONNECT_DELAY_SECONDS: Final = 15.0

# Prefixes of the TTLockError messages raised when the safe refuses the key
# itself (wrong AES key, revoked or expired key, wrong admin password), as
# opposed to a single command failing. These start a reauth flow.
KEY_REJECTED_ERRORS: Final = (
    "Failed to validate virtual key",
    "Failed to authorize as admin",
    "Failed to check_random",
    "Failed to decrypt",
)

# The auto-lock range most firmware reports, shown until the safe is read.
DEFAULT_AUTO_LOCK_MAX_SECONDS: Final = 900
