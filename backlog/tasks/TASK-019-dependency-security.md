# TASK-019: Review and remediate dependency audit findings

**Status:** in progress · **Milestone:** cross-cutting · **Labels:** security, dependencies

## Baseline and current audit

On the `e5d212a` workspace lockfile, `bun audit --json` reported nine
advisories: four high, four moderate, and one low. `bun audit --production
--json` reported three high advisories, all for `js-yaml`. After the approved
`js-yaml` override below, the full audit reports six advisories: one high, four
moderate, and one low (exit 1); the production-filtered audit reports none
(exit 0).

The original 2026-11-10 audit also found nine advisories, including three in the
development-only Workbox tree. A production-filtered workspace dependency is
not necessarily included in the deployed site: the portfolio is a static
export, and the generated API client and worker are still scaffolds. These
findings identify vulnerable versions, not confirmed exploits. The workspace
audit also does not cover a separately installed client package: see below.

The ownership and usage review uses `bun why`, installed package source,
workspace scripts, and the published GitHub advisories. Recheck the advisory
data and dependency graph when applying any fix; both can change independently
of this document.

## Findings and current mitigations

| Dependency and advisories | Owner and observed use | Fix availability and handling |
| --- | --- | --- |
| `js-yaml@4.2.0`: three high ([GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m), [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj), [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh)) | `@hey-api/openapi-ts` → `@hey-api/json-schema-ref-parser` → `js-yaml`; the client declares the generator as a production dependency, but the current client is a scaffold and the portfolio source does not use it. The parser can process YAML; no deployed YAML endpoint was identified. | The approved workspace override resolves the parser's exact `4.2.0` pin to `4.3.2`, fixing the reported 4.x findings in this workspace. This override does **not** propagate to external consumers; do not process untrusted specifications in their unpatched dependency graphs. |
| `zod@3.25.76`: high ([GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)) | The root's development-only `backlog` CLI requires Zod 3; its `@anthropic-ai/sdk` dependency also permits it as a peer. The portfolio and worker directly use `zod@4.6.7`, outside this advisory's affected range. | The reported fix is `4.6.6`; `backlog@1.4.56` requires `^3.24.4`. Do not force a major upgrade without upstream support and validation. Keep the development CLI local and avoid feeding it untrusted or unbounded data. |
| `@hono/node-server@1.19.18`: moderate ([GHSA-rmxm-3fg6-px4f](https://github.com/advisories/GHSA-rmxm-3fg6-px4f)) | Development-only `backlog` CLI. The installed CLI imports `serve`, not the affected `serveStatic` API, and its board defaults to `127.0.0.1`. No deployed use was identified. | The advisory is fixed in `2.1.3`, outside Backlog's `^1.13.7` range; check other advisories when selecting a version. Keep the board local and do not expose protected static files through the affected adapter. **Do not use the audit tool's suggested downgrade:** see below. |
| `esbuild@0.18.20`: moderate ([GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)) | The worker's development-only `drizzle-kit` → `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils`; the loader uses esbuild for transforms. The worker schema and migrations are not implemented. | `0.25.0` fixes the reported dev-server issue, but `core-utils@3.3.2` requires `~0.18.20` and is deprecated in favor of `tsx`. Avoid running this old esbuild's development server; reassess the Drizzle dependency chain before implementing migrations. |
| `glob@11.1.0`: moderate ([GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4)) | The portfolio's development-only `workbox-build@7.4.1`. The inspected Workbox file-manifest path uses `globSync` without an abort signal; the current site build does not invoke Workbox. | `14.0.2` fixes the reported abort issue, outside Workbox's `^11.0.1` range. Do not force the major override without compatibility validation. |
| `minimatch@10.2.6`: moderate ([GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)) | Development-only Workbox → `glob`; the advisory concerns attacker-controlled patterns with optimization enabled. Workbox is not invoked by the current build. | `11.0.1` fixes the finding, outside glob's `^10.1.1` range. Do not supply untrusted patterns or force a major override without validation. |
| `deepmerge@4.3.1`: low ([GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)) | Development-only Workbox → `@rollup/plugin-node-resolve`; the inspected plugin uses `deepMerge` to copy its own defaults. Workbox is not invoked by the current build. | No patched version in the affected 4.x range was listed in the advisory. The audit tool's downgrade is outside the plugin's `^4.2.2` range; do not apply it without compatibility and security review. |

Workbox remains installed but unused: no service worker or offline build is
currently enabled. Before [TASK-014](TASK-014-portfolio-offline.md) invokes it,
reassess upstream fixes or an approved alternative and document a mitigation or
explicit owner acceptance for any remaining findings. Do not interpret the
current lack of invocation as blanket approval to enable the offline build.

## Applied `js-yaml` override and its limits

The approved root manifest override is scoped to
`@hey-api/json-schema-ref-parser` → `js-yaml@4.3.2`, even though parser
`1.4.4` pins `4.2.0`. `bun why js-yaml` and the installed parser both resolve
`4.3.2` in this workspace. The root-declared Bun `1.4.4` generated lockfile
format 3 while preserving unrelated entries; the Pixi-locked Bun `1.4.2`
accepted it on a scripts-disabled frozen install. A `1.4.2` lockfile-only
rewrite stripped unrelated `libc` and install-script metadata, so it was not
used to produce the final lockfile. An isolated scope probe kept a separate
root `js-yaml@4.2.0` unchanged while resolving `4.3.2` for the parser.

The repository regression tests exercise that actual dependency path, ordinary
ordered maps, two oversized merge limits, and bundling a YAML OpenAPI fixture
with anchors and an external `$ref`. An isolated comparison also produced
identical old and patched generator output for this fixture using TypeScript
6.0.3. The patched version rejects oversized merges that `4.2.0` accepted;
this is a compatibility change, not a complete proof of safety or compatibility.

M3 must test the real contract: the current workspace's TypeScript `7.0.2`
exposes no `SyntaxKind` through its package entry, so the unmodified
`@hey-api/openapi-ts@0.99.0` CLI fails during initialization even before this
override. The client generator remains unvalidated in the actual workspace.

The override is **workspace-local**, not a fix for consumers of the published
client. A locally packed, built client installed in separate Bun and npm
consumers without root overrides resolved `js-yaml@4.2.0`. The Bun consumer's
production audit reported the three high advisories; npm listed five affected
package entries through the same three advisories. No package was published.
Before publishing, resolve or mitigate the downstream graph, or obtain explicit
owner acceptance, and audit a fresh external consumer as required by
[TASK-006](TASK-006-client-gen-and-publish.md).

## Validation and environment limitations

- Post-change full and production audits gave the results above with Bun
  `1.4.2`; the only changed locked package version is `js-yaml`.
- A clean `bun install --frozen-lockfile` with Bun `1.4.2` failed when the
  trusted `@asamarts/alint@0.22.0` postinstall could not verify the GitHub
  download certificate. Retrying with the system CA bundle instead reached a
  TLS connection failure; no certificate check was disabled. A clean frozen
  install with `--ignore-scripts` succeeded and resolved the parser to
  `4.3.2`. This is not a successful unmodified install.
- `bun run check` passed with Bun `1.4.2`, Vale `3.26.0`, and alint `0.22.0`
  staged from its verified PyPI wheel. The locked Lychee `0.23.0` binary was
  unavailable here; a temporary adapter ran Lychee `0.24.2` with the old
  `include_fragments = true` setting translated to `"full"`. Browser tests
  were skipped in this passing run and exercised separately. Other runs, with
  and without Chromium, exceeded the default five-second timeout on the
  existing portfolio TypeScript-alias test. That test passed in isolation.
  A serial workspace test run with a 15-second default timeout passed 151
  tools tests and 99 portfolio tests with Chromium; the old-WebKit test was
  skipped in that run and exercised separately.
- `bun run build:portfolio` succeeded. The export's 23 SEO tests passed; the
  offline source/export link check passed with the adapted Lychee `0.24.2`.
  A separate fresh-export browser run passed 31 tests with Chromium and the
  optional PhantomJS old-WebKit proxy; this is not a Tizen hardware test.
- Repeat the clean frozen install and workspace checks in the unmodified,
  Pixi-locked environment when its tools and certificate chain are available.
  The substituted Lychee run is not equivalent to that final check.

## Unsafe automatic fix

`bun audit fix --dry-run` proposed downgrading `@hono/node-server` to `1.19.9`
to avoid GHSA-rmxm-3fg6-px4f. An isolated install and audit of that candidate
instead reported **one high and three moderate** other advisories:
[GHSA-wc8c-qw6v-h7f6](https://github.com/advisories/GHSA-wc8c-qw6v-h7f6),
[GHSA-92pp-h63x-v22m](https://github.com/advisories/GHSA-92pp-h63x-v22m),
[GHSA-frvp-7c67-39w9](https://github.com/advisories/GHSA-frvp-7c67-39w9), and
[GHSA-jpvv-r467-5p4w](https://github.com/advisories/GHSA-jpvv-r467-5p4w).
Do not apply that downgrade or treat a lower count for the original advisory as
a security fix. The dry run also reported blocked range changes for the other
findings; no automatic fixes or unapproved major overrides were applied.

## Acceptance criteria

- [x] Re-run the full and production-only audits and trace affected versions to
      their workspace owners, supported dependency ranges, and actual usage.
- [ ] Resolve, mitigate, or explicitly record acceptance of the Workbox findings
      before enabling the offline build in [TASK-014](TASK-014-portfolio-offline.md).
      Consider maintained upstream updates or an approved alternative; do not
      force incompatible major-version overrides without validation.
- [ ] Before publishing the client, resolve or mitigate the external consumer's
      `js-yaml` findings, or obtain explicit owner acceptance, as tracked in
      [TASK-006](TASK-006-client-gen-and-publish.md).
- [x] Review the existing high-severity `js-yaml` and `zod` findings and the
      moderate findings separately, including whether patched upstream versions
      are available and whether affected code runs in production.
- [ ] Update manifests and lockfiles only after required dependency approval,
      then rerun the audits, frozen install, workspace checks, and static build
      in the standard locked environment. Approval, audits, workaround checks,
      and build are recorded above; the unmodified install and check remain.
- [x] Record any unresolved advisories, affected paths, and mitigation rationale
      without misrepresenting an audit finding as a confirmed exploit.
