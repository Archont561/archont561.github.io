# TASK-019: Review and remediate dependency audit findings

**Status:** not started · **Milestone:** cross-cutting · **Labels:** security, dependencies

## Audit snapshot

A `bun audit` comparison on 2026-11-10 found nine advisories in the current
lockfile, six of which were already present before the M5 dependency additions.
The audit reports potentially affected packages, not proof of an exploitable
path in this site.

Three new findings come from the development-only `workbox-build@7.4.1` tree:

- `glob@11.1.0`: moderate, [GHSA-3g3m-2fjr-6pw4](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4).
- `minimatch@10.2.6`: moderate, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).
- `deepmerge@4.3.1`: low, [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4).

At this snapshot, `bun audit fix --dry-run` reports that patched `glob` and
`minimatch` versions are outside their parents' required major ranges. Its
suggested `deepmerge` downgrade is also outside the parent range; none of these
changes was applied.

The existing findings cover `js-yaml@4.2.0`, `zod@3.25.76`,
`@hono/node-server@1.19.18`, and `esbuild@0.18.20`. A production-only audit
also flags the three existing high-severity `js-yaml` advisories; it reaches
that package through the client code-generation dependency tree. Assess actual
usage and exposure rather than assuming the installed package is deployed.

## Acceptance criteria

- [ ] Re-run the full and production-only audits and trace affected versions to
      their workspace owners, supported dependency ranges, and actual usage.
- [ ] Resolve, mitigate, or explicitly record acceptance of the Workbox findings
      before enabling the offline build in [TASK-014](TASK-014-portfolio-offline.md).
      Consider maintained upstream updates or an approved alternative; do not
      force incompatible major-version overrides without validation.
- [ ] Review the existing high-severity `js-yaml` and `zod` findings and the
      moderate findings separately, including whether patched upstream versions
      are available and whether affected code runs in production.
- [ ] Update manifests and lockfiles only after required dependency approval,
      then rerun the audits, frozen install, workspace checks, and static build.
- [ ] Record any unresolved advisories, affected paths, and mitigation rationale
      without misrepresenting an audit finding as a confirmed exploit.
