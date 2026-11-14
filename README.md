# Offline sandbox (orphan branch)

Built 2026-11-14T22:08:11Z from commit `69a4e99` for platform `linux-64`.
`pixi.lock` sha256 `6344720ba55bfa0002d3eafb6f1992d56a0cbf30e155730be9138f0aa96d423c`.

The verified self-bootstrap binary is stored at `.pixi-sandbox/tools/linux-64/pixi-sandbox`. The branch root intentionally contains documentation only.

| env | platform | packed | unpacked | files |
| --- | --- | ---: | ---: | ---: |
| `default` | linux-64 | 231.7 MiB | 885.3 MiB | 106 |


## Restore on the disconnected machine

```bash
./.pixi-sandbox/tools/linux-64/pixi-sandbox doctor --branch-location . --verify
./.pixi-sandbox/tools/linux-64/pixi-sandbox restore --branch-location . --output-path <project> --force
# then, from <project> with no network, use pixi as the sole entrypoint:
pixi install --frozen --offline
pixi run --frozen -- cargo build --offline
```

Every manifest blob is verified before it is written into the working tree.
