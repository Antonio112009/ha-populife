# ha-populife

Home Assistant custom integration (HACS) for Populife / TTLock Bluetooth smart safes.
The code lives in `custom_components/populife/`; the BLE protocol comes from the `ttlock-ble` library.

## Workflow: trunk-based

- `main` is protected. Never commit or push to it directly.
- Start every change on a short-lived branch from the latest `main`: `feat/…`, `fix/…`, `chore/…`, `docs/…`.
- Open a pull request into `main`. It is squash-merged once all required checks pass.
- Merging into `main` publishes a release automatically when the manifest version is new.
  HACS users get that version as an update.

## Version bump rule

Any PR that changes `custom_components/` or `hacs.json` **must** raise the version in
`custom_components/populife/manifest.json`. The `Version bump` CI check blocks the merge otherwise.
PRs that touch only docs, CI, tests or dev dependencies keep the version and publish nothing.

Bump with the script (it edits only the manifest's `version` field):

```bash
uv run python scripts/bump_version.py patch   # bug fix, no behaviour change for users
uv run python scripts/bump_version.py minor   # new feature, entity, option or config flow step
uv run python scripts/bump_version.py major   # breaking: removed entity, changed unique_id, new minimum HA version
```

Bump once per PR, in the same branch, as its own commit (`chore: bump version to X.Y.Z`).
If `main` moved on and already released your number, bump again after rebasing.

The `/bump-version` skill in `.claude/skills/bump-version/` runs this procedure.

## Checks to run before opening a PR

```bash
uv run ruff format . && uv run ruff check . && uv run mypy && uv run pytest
```

hassfest (needs Docker): `docker run --rm -v "$PWD":/github/workspace ghcr.io/home-assistant/hassfest`

## Dependencies

- Home Assistant pins its own libraries (the Bluetooth stack, `serialx`, …). The dev group in
  `pyproject.toml` must use exactly those versions; `scripts/check_ha_pins.py` (run in CI) fails
  otherwise. Dependabot ignores those packages: update them together with
  `pytest-homeassistant-custom-component`, to the versions the new Home Assistant pins.
- `ttlock-ble` is pinned in both `pyproject.toml` and `manifest.json` `requirements` (what users
  get installed); the same check requires them to match. Changing the manifest needs a version bump.

## Panel (frontend)

- Sources in `frontend/` (TypeScript 6, Lit 3, Vite 8, Vitest, ESLint strict); the build goes to
  `custom_components/populife/frontend/populife-panel.js` and **must be committed**: CI rebuilds
  it and fails on any difference. After changing `frontend/src`, run `npm run build` in `frontend/`.
- Style only with Home Assistant's CSS variables; don't depend on HA's internal components
  (they change between releases), except `ha-icon` and `ha-menu-button`.
- Data comes from `populife/*` websocket commands (`websocket.py`), entity states, and
  `history/history_during_period`; every action goes through entity services, which check access.
- Check UI changes in the dev harness: `npm run dev`, then `/dev/index.html?dark=1&ru=1&narrow=1`.
- A panel change that ships to users changes `custom_components/`, so it needs a version bump.

## Conventions

- Python 3.14 and Home Assistant 2026.10+. Flow schemas use `probatio`, not `voluptuous`.
- Ruff runs with every rule enabled; mypy runs in strict mode. Coverage must stay at or above 90%.
- Translations are literal strings in `translations/en.json` (custom integrations do not resolve `[%key:…%]`).
- Never log, store in plain text, or put into diagnostics the safe's AES key, unlock key or admin password.
- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `ci:`, `test:`).
