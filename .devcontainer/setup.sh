#!/usr/bin/env bash
# Bootstrap the committed environments without global installs or servers.
set -euo pipefail

pixi install --locked
# Install the CLI's dependencies before invoking it. The command re-checks the
# frozen install, syncs Vale and only installs hooks when explicitly requested.
pixi run --locked bun install --frozen-lockfile
if [[ "${INSTALL_HOOKS:-false}" == "true" ]]; then
  pixi run --locked tools devcontainer --setup --hooks
else
  pixi run --locked tools devcontainer --setup
fi
printf '\nReady. Run pixi run check or pixi run bun run --cwd apps/portfolio dev.\n'
