import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isIsoDate } from "./dates.ts";
import { pathExists, updateTextFile } from "./files.ts";

export const REGISTRY_MANIFEST = "data/packages-manifest.json";
export const REGISTRY_SNAPSHOT = "data/packages.json";
export const GRAPHQL = "https://prefix.dev/api/graphql";
export const COUNTED = ["authored", "upstream", "unreviewed"] as const;
const ORDER = ["npm", "pypi", "prefix"] as const;
const RELATIONS = ["authored", "alias", "upstream", "reserved", "unreviewed"] as const;
type RegistryName = (typeof ORDER)[number];
type Relation = (typeof RELATIONS)[number];
interface Entry {
  name: string;
  relation: Relation;
  alias_of?: string;
  repo?: string;
  note?: string;
  upstream?: string;
}
interface Registry {
  name: RegistryName;
  label: string;
  ecosystem: string;
  url: string;
  packages: Entry[];
}
export interface Manifest {
  owner: string;
  identity: {
    npm: { user?: string; scope: string };
    pypi: { user?: string };
    prefix: { channel: string; install_channel?: string };
  };
  registries: Registry[];
}
export interface Evidence extends Entry {
  version?: string;
  description?: string;
  license?: string;
  published?: string;
  repository?: string;
  maintainers?: string[];
  requires_python?: string;
  releases?: number;
  builds?: number;
  platforms?: string[];
  size?: number;
  url: string;
  proof: string;
}
export interface RegistrySnapshot {
  source: Record<RegistryName, string>;
  retrieved: string;
  owner: string;
  identity: Manifest["identity"];
  registries: Array<Omit<Registry, "packages"> & { packages: Evidence[] }>;
}
type JsonRecord = Record<string, unknown>;
type Captures = Record<RegistryName, Record<string, unknown>>;
export type JsonFetcher = (url: string, body?: unknown) => Promise<unknown>;

function object(value: unknown, label: string): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(`${label} must be an object`);
  return value as JsonRecord;
}
function text(value: unknown): string | undefined {
  return typeof value === "string" && value ? value : undefined;
}
function objectOrEmpty(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
function date(value: unknown): string | undefined {
  return text(value)?.slice(0, 10);
}

function validateEntries(registry: JsonRecord): void {
  if (
    !text(registry.label) ||
    !text(registry.ecosystem) ||
    !text(registry.url) ||
    !Array.isArray(registry.packages)
  ) {
    throw new Error(`${registry.name}: registry metadata and packages are required`);
  }
  const names = new Set<string>();
  for (const rawEntry of registry.packages) {
    const entry = object(rawEntry, `${registry.name} package`);
    if (
      !text(entry.name) ||
      typeof entry.relation !== "string" ||
      !RELATIONS.includes(entry.relation as Relation)
    ) {
      throw new Error(`${registry.name}: invalid package name or relation`);
    }
    const name = entry.name as string;
    if (names.has(name)) throw new Error(`${registry.name}: duplicate package ${name}`);
    names.add(name);
    if (entry.relation === "alias" && !text(entry.alias_of))
      throw new Error(`${registry.name}/${name}: alias needs alias_of`);
  }
  validateAliases(registry.name, registry.packages, names);
}

function validateAliases(registry: unknown, entries: unknown[], names: Set<string>): void {
  for (const rawEntry of entries) {
    const entry = rawEntry as Entry;
    if (entry.relation === "alias" && !names.has(entry.alias_of ?? ""))
      throw new Error(`${registry}/${entry.name}: alias target is not declared`);
  }
}

function validateRegistry(raw: unknown, seen: Set<string>): void {
  const registry = object(raw, "registry");
  if (
    typeof registry.name !== "string" ||
    !ORDER.includes(registry.name as RegistryName) ||
    seen.has(registry.name)
  ) {
    throw new Error(
      `Invalid or duplicate registry ${String(registry.name)}; expected npm, pypi, prefix`,
    );
  }
  seen.add(registry.name);
  validateEntries(registry);
}

/** Validate the curated account and each distinct package relation before fetching. */
export function parseRegistryManifest(input: unknown): Manifest {
  const value = object(input, REGISTRY_MANIFEST);
  const identity = object(value.identity, "identity");
  const npm = object(identity.npm, "identity.npm");
  object(identity.pypi, "identity.pypi");
  const prefix = object(identity.prefix, "identity.prefix");
  if (!text(value.owner) || !text(npm.scope) || !text(prefix.channel))
    throw new Error("Manifest needs owner, identity.npm.scope and identity.prefix.channel");
  if (!Array.isArray(value.registries)) throw new Error("Manifest registries must be an array");
  const seen = new Set<string>();
  for (const raw of value.registries) validateRegistry(raw, seen);
  if (seen.size !== ORDER.length) throw new Error("Manifest must cover npm, pypi, and prefix");
  return value as unknown as Manifest;
}

export function loadRegistryManifest(root: string): Manifest {
  return parseRegistryManifest(JSON.parse(readFileSync(join(root, REGISTRY_MANIFEST), "utf8")));
}

/** HTTP errors identify the registry and retain a short response body. */
export async function fetchRegistryJson(url: string, body?: unknown): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Accept: "application/json",
        "User-Agent": "archont561-registry-watch",
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (cause) {
    throw new Error(
      `Request to ${url} failed: ${cause instanceof Error ? cause.message : String(cause)}`,
      { cause },
    );
  }
  if (!response.ok)
    throw new Error(
      `HTTP ${response.status} from ${url}: ${(await response.text()).slice(0, 400)}`,
    );
  try {
    return await response.json();
  } catch (cause) {
    throw new Error(`Invalid JSON from ${url}`, { cause });
  }
}

const PAGE_QUERY = `query($channel: String!, $limit: Int!, $page: Int!) {
  channel(name: $channel) { name isPublic packages(limit: $limit, page: $page) {
    totalCount pages page { name summary lastCreatedDate totalSize platforms versions(limit: 1) { totalCount page { version } } }
  } }
}`;

async function channelPage(
  fetcher: JsonFetcher,
  channel: string,
  page: number,
): Promise<JsonRecord | undefined> {
  const payload = object(
    await fetcher(GRAPHQL, { query: PAGE_QUERY, variables: { channel, limit: 50, page } }),
    GRAPHQL,
  );
  if (array(payload.errors).length)
    throw new Error(`prefix.dev GraphQL error: ${JSON.stringify(payload.errors)}`);
  const channelData = objectOrEmpty(payload.data).channel;
  return channelData ? object(channelData, "prefix.dev channel") : undefined;
}

async function resolveChannel(
  channel: string,
  fetcher: JsonFetcher,
): Promise<{ selected: string; first: JsonRecord }> {
  for (const selected of [...new Set([channel, channel.replace(/^@/, "")])]) {
    const first = await channelPage(fetcher, selected, 0);
    if (first) return { selected, first };
  }
  throw new Error(`prefix.dev could not resolve channel ${channel}`);
}

async function channelRows(channel: string, fetcher: JsonFetcher): Promise<unknown[]> {
  const { selected, first } = await resolveChannel(channel, fetcher);
  const listing = object(first.packages, "prefix.dev packages");
  if (
    !Array.isArray(listing.page) ||
    typeof listing.pages !== "number" ||
    listing.pages < 1 ||
    listing.pages > 1000
  )
    throw new Error("Invalid prefix.dev pagination");
  const rows = [...listing.page];
  for (let page = 1; page < listing.pages; page++) {
    const more = await channelPage(fetcher, selected, page);
    if (!more) throw new Error(`prefix.dev channel disappeared on page ${page}`);
    const current = object(more.packages, "prefix.dev packages");
    if (!Array.isArray(current.page)) throw new Error(`Invalid prefix.dev page ${page}`);
    rows.push(...current.page);
  }
  if (typeof listing.totalCount === "number" && rows.length !== listing.totalCount)
    throw new Error(`prefix.dev returned ${rows.length} of ${listing.totalCount} packages`);
  return rows;
}

export async function fetchChannel(
  channel: string,
  fetcher: JsonFetcher = fetchRegistryJson,
): Promise<Record<string, unknown>> {
  const result: Record<string, unknown> = Object.create(null);
  for (const raw of await channelRows(channel, fetcher)) {
    const row = object(raw, "prefix.dev package");
    const name = text(row.name);
    if (!name || Object.hasOwn(result, name))
      throw new Error(`Missing or duplicate prefix.dev package ${String(name)}`);
    const versions = objectOrEmpty(row.versions);
    const latest = objectOrEmpty(array(versions.page)[0]);
    result[name] = {
      summary: row.summary,
      platforms: row.platforms,
      lastCreatedDate: row.lastCreatedDate,
      totalSize: row.totalSize,
      version: latest.version,
      builds: versions.totalCount,
    };
  }
  return result;
}

export async function npmInventory(
  user: string,
  fetcher: JsonFetcher = fetchRegistryJson,
): Promise<string[]> {
  const names: string[] = [];
  for (let offset = 0; offset < 10_000; offset += 50) {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(`maintainer:${user}`)}&size=50&from=${offset}`;
    const payload = object(await fetcher(url), url);
    if (!Array.isArray(payload.objects) || typeof payload.total !== "number")
      throw new Error(`${url}: invalid inventory response`);
    for (const item of payload.objects) {
      const name = text(objectOrEmpty(objectOrEmpty(item).package).name);
      if (!name) throw new Error(`${url}: inventory entry has no package name`);
      names.push(name);
    }
    if (offset + 50 >= payload.total) return names;
    if (payload.objects.length === 0) throw new Error(`${url}: incomplete npm inventory`);
  }
  throw new Error("npm inventory exceeded 10,000 packages");
}

type ProjectedEvidence = Omit<Evidence, keyof Entry | "proof">;

function npmEvidence(name: string, record: JsonRecord): ProjectedEvidence {
  const version = text(objectOrEmpty(record["dist-tags"]).latest);
  const release = objectOrEmpty(objectOrEmpty(record.versions)[version ?? ""]);
  const repository =
    typeof release.repository === "string"
      ? release.repository
      : text(objectOrEmpty(release.repository).url);
  return {
    version,
    description: text(record.description),
    license: text(release.license),
    published: date(objectOrEmpty(record.time)[version ?? ""]),
    repository,
    maintainers: array(record.maintainers)
      .map((item) => text(objectOrEmpty(item).name))
      .filter((item): item is string => Boolean(item)),
    url: `https://www.npmjs.com/package/${name}`,
  };
}

function pypiEvidence(name: string, record: JsonRecord): ProjectedEvidence {
  const info = objectOrEmpty(record.info);
  const version = text(info.version);
  const releases = objectOrEmpty(record.releases);
  const files = array(releases[version ?? ""]);
  const urls = objectOrEmpty(info.project_urls);
  return {
    version,
    description: text(info.summary),
    license: text(info.license),
    published: date(objectOrEmpty(files[0]).upload_time),
    repository: text(urls.Repository) ?? text(urls.Source) ?? text(urls["Home-page"]),
    requires_python: text(info.requires_python),
    releases: Object.values(releases).filter((value) => array(value).length).length,
    url: `https://pypi.org/project/${name}/`,
  };
}

function publishedRecord(registry: Registry, name: string, raw: unknown): ProjectedEvidence {
  const record = object(raw, `${registry.name}/${name} record`);
  if (registry.name === "npm") return npmEvidence(name, record);
  if (registry.name === "pypi") return pypiEvidence(name, record);
  return {
    version: text(record.version),
    description: text(record.summary),
    builds: typeof record.builds === "number" ? record.builds : undefined,
    platforms: array(record.platforms)
      .filter((item): item is string => typeof item === "string")
      .sort(),
    size: typeof record.totalSize === "number" ? record.totalSize : undefined,
    published: date(record.lastCreatedDate),
    url: `${registry.url}/packages/${name}`,
  };
}

function proof(
  registry: RegistryName,
  entry: Entry,
  context: { evidence: ProjectedEvidence; identity: Manifest["identity"] },
): string {
  const { evidence, identity } = context;
  const repository = (evidence.repository ?? "").replace(/\.git$/, "").replace(/\/$/, "");
  if (registry === "npm" && entry.name.startsWith(`${identity.npm.scope}/`)) return "scope";
  if (entry.repo && repository.toLowerCase().endsWith(`github.com/${entry.repo}`.toLowerCase()))
    return "repository";
  if (registry === "npm" && identity.npm.user && evidence.maintainers?.includes(identity.npm.user))
    return "maintainer";
  if (registry === "prefix") return "channel";
  return "declared";
}

function reservation(item: Evidence): boolean {
  return (
    (!item.version || item.version === "0.0.0") &&
    /reserved package name|trusted.?publishing|placeholder|setup package/i.test(
      item.description ?? "",
    )
  );
}

function assertEvidence(registry: RegistryName, entry: Entry, item: Evidence | undefined): void {
  const label = `${registry}/${entry.name}`;
  if (!item) throw new Error(`${label}: declared package missing from capture`);
  for (const [key, value] of Object.entries(entry)) {
    if ((item as unknown as JsonRecord)[key] !== value)
      throw new Error(`${label}: manifest and capture differ on ${key}; re-run the capture`);
  }
  if (!text(item.url) || !text(item.proof)) throw new Error(`${label}: missing registry evidence`);
  if (reservation(item) !== (entry.relation === "reserved"))
    throw new Error(
      `${label}: release/reservation disagrees with manifest; reconcile the manifest, not the count`,
    );
  if (!item.version && entry.relation !== "reserved")
    throw new Error(`${label}: a published package needs a version`);
}

function checkCapturedRegistry(declared: Registry, snapshot: RegistrySnapshot): void {
  const captured = snapshot.registries.find((item) => item.name === declared.name);
  if (!captured || !Array.isArray(captured.packages))
    throw new Error(`${declared.name}: registry missing from capture`);
  if (
    captured.label !== declared.label ||
    captured.url !== declared.url ||
    captured.ecosystem !== declared.ecosystem
  )
    throw new Error(`${declared.name}: registry metadata changed; re-run the capture`);
  const byName = new Map(captured.packages.map((item) => [item.name, item]));
  if (byName.size !== captured.packages.length || byName.size !== declared.packages.length)
    throw new Error(`${declared.name}: capture and manifest disagree on package names`);
  for (const entry of declared.packages)
    assertEvidence(declared.name, entry, byName.get(entry.name));
}

/** Reconcile complete captures, curated relations, and registry evidence. */
export function reconcileRegistrySnapshot(snapshot: RegistrySnapshot, manifest: Manifest): void {
  if (!snapshot || typeof snapshot !== "object" || !isIsoDate(snapshot.retrieved))
    throw new Error("Registry capture has no valid date");
  if (
    snapshot.owner !== manifest.owner ||
    JSON.stringify(snapshot.identity) !== JSON.stringify(manifest.identity)
  )
    throw new Error("Registry capture identity differs from the manifest; re-run the capture");
  if (
    !Array.isArray(snapshot.registries) ||
    snapshot.registries.length !== ORDER.length ||
    new Set(snapshot.registries.map((item) => item.name)).size !== ORDER.length
  )
    throw new Error("A partial registry capture must never be committed");
  for (const declared of manifest.registries) checkCapturedRegistry(declared, snapshot);
}

export function projectRegistryCapture(
  captures: Captures,
  manifest: Manifest,
  retrieved: string,
): RegistrySnapshot {
  const snapshot: RegistrySnapshot = {
    source: {
      npm: "https://registry.npmjs.org/<name>",
      pypi: "https://pypi.org/pypi/<name>/json",
      prefix: GRAPHQL,
    },
    retrieved,
    owner: manifest.owner,
    identity: manifest.identity,
    registries: [],
  };
  for (const name of ORDER) {
    const registry = manifest.registries.find((item) => item.name === name);
    if (!registry) throw new Error(`${name}: registry missing from manifest`);
    const records = captures[name] ?? {};
    const declared = new Set(registry.packages.map((item) => item.name));
    const missing = [...declared].filter((item) => !Object.hasOwn(records, item));
    const unexpected = Object.keys(records).filter((item) => !declared.has(item));
    if (missing.length)
      throw new Error(`${name}: declared packages missing from capture: ${missing.join(", ")}`);
    if (unexpected.length)
      throw new Error(
        `${name}: undeclared packages require curation: ${unexpected.sort().join(", ")}`,
      );
    const packages = registry.packages.map((entry) => {
      const evidence = publishedRecord(registry, entry.name, records[entry.name]);
      return {
        ...entry,
        ...Object.fromEntries(Object.entries(evidence).filter(([, value]) => value !== undefined)),
        name: entry.name,
        proof: proof(name, entry, { evidence, identity: manifest.identity }),
      } as Evidence;
    });
    snapshot.registries.push({
      name,
      label: registry.label,
      ecosystem: registry.ecosystem,
      url: registry.url,
      packages,
    });
  }
  reconcileRegistrySnapshot(snapshot, manifest);
  return snapshot;
}

export function registryCounts(
  snapshot: RegistrySnapshot,
): Record<string, { published: number; aliases: number; reserved: number }> {
  return Object.fromEntries(
    snapshot.registries.map((registry) => [
      registry.name,
      {
        published: registry.packages.filter((item) =>
          (COUNTED as readonly string[]).includes(item.relation),
        ).length,
        aliases: registry.packages.filter((item) => item.relation === "alias").length,
        reserved: registry.packages.filter((item) => item.relation === "reserved").length,
      },
    ]),
  );
}

export function checkRegistrySnapshot(root: string): RegistrySnapshot {
  const manifest = loadRegistryManifest(root);
  const file = join(root, REGISTRY_SNAPSHOT);
  if (!pathExists(file)) throw new Error(`${REGISTRY_SNAPSHOT} is missing; run tools registries`);
  const snapshot = JSON.parse(readFileSync(file, "utf8")) as RegistrySnapshot;
  reconcileRegistrySnapshot(snapshot, manifest);
  return snapshot;
}

async function retrieveCaptures(manifest: Manifest, fetcher: JsonFetcher): Promise<Captures> {
  const captures: Captures = {
    npm: Object.create(null),
    pypi: Object.create(null),
    prefix: Object.create(null),
  };
  for (const registry of manifest.registries) {
    if (registry.name === "prefix") {
      captures.prefix = await fetchChannel(manifest.identity.prefix.channel, fetcher);
      continue;
    }
    for (const item of registry.packages) {
      const url =
        registry.name === "npm"
          ? `https://registry.npmjs.org/${encodeURIComponent(item.name)}`
          : `https://pypi.org/pypi/${encodeURIComponent(item.name)}/json`;
      captures[registry.name][item.name] = await fetcher(url);
    }
  }
  if (manifest.identity.npm.user) {
    const found = await npmInventory(manifest.identity.npm.user, fetcher);
    const unexpected = found.filter((name) => !Object.hasOwn(captures.npm, name));
    if (unexpected.length)
      throw new Error(
        `npm: packages missing from ${REGISTRY_MANIFEST}: ${unexpected.sort().join(", ")}`,
      );
  }
  return captures;
}

function sameCapture(file: string, snapshot: RegistrySnapshot): boolean {
  if (!pathExists(file)) return false;
  const previous: unknown = JSON.parse(readFileSync(file, "utf8"));
  return Boolean(
    previous &&
      typeof previous === "object" &&
      !Array.isArray(previous) &&
      JSON.stringify({ ...previous, retrieved: "" }) ===
        JSON.stringify({ ...snapshot, retrieved: "" }),
  );
}

/** Fetch every registry and atomically replace only a fully reconciled snapshot. */
export async function refreshRegistries(
  root: string,
  options: { fetcher?: JsonFetcher; retrieved?: string } = {},
): Promise<boolean> {
  const manifest = loadRegistryManifest(root);
  const captures = await retrieveCaptures(manifest, options.fetcher ?? fetchRegistryJson);
  const snapshot = projectRegistryCapture(
    captures,
    manifest,
    options.retrieved ?? new Date().toISOString().slice(0, 10),
  );
  const file = join(root, REGISTRY_SNAPSHOT);
  if (sameCapture(file, snapshot)) return false;
  mkdirSync(join(root, "data"), { recursive: true });
  return updateTextFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, false);
}
