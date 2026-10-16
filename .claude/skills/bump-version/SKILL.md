---
name: bump-version
description: Raise the Populife integration version before opening or updating a pull request. Use whenever a branch changes custom_components/ or hacs.json, when the "Version bump" CI check fails, or when asked to bump, release or publish a new version.
---

# Bump the integration version

The version in `custom_components/populife/manifest.json` is the release version. Merging a PR
with a new version into `main` publishes it to HACS automatically.

1. Make sure you are on a feature branch, not `main` (`git branch --show-current`).
2. Check whether a bump is needed:
   ```bash
   git fetch origin main
   git diff --quiet origin/main...HEAD -- custom_components hacs.json && echo "no bump needed"
   ```
   If nothing under `custom_components/` or `hacs.json` changed, stop: this PR publishes nothing.
3. Compare against the version already on `main`:
   ```bash
   git show origin/main:custom_components/populife/manifest.json | grep '"version"'
   grep '"version"' custom_components/populife/manifest.json
   ```
   If the branch is already ahead of `main`, it has been bumped. Do not bump twice in one PR.
4. Pick the part from what the branch changes for users:
   - `patch`: bug fixes and internal changes users don't notice.
   - `minor`: new features, entities, options, config flow steps or supported devices.
   - `major`: breaking changes, such as removed or renamed entities, changed unique IDs, data that needs migration, or a higher minimum Home Assistant version.
   If the user named a part or an exact version (`X.Y.Z`), use that instead.
5. Run the bump and commit it on its own:
   ```bash
   uv run python scripts/bump_version.py <patch|minor|major|X.Y.Z>
   git add custom_components/populife/manifest.json
   git commit -m "chore: bump version to <new version>"
   ```
6. Verify that the CI check will pass:
   ```bash
   uv run python scripts/bump_version.py --check "$(git show origin/main:custom_components/populife/manifest.json | python3 -c 'import json,sys;print(json.load(sys.stdin)["version"])')"
   ```
7. Report the old and new version, and which part you bumped and why.
