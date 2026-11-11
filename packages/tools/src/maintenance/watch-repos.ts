import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { isIsoDate } from "./dates.ts";
import { pathExists, updateTextFile } from "./files.ts";

export const REPOSITORY_SOURCE =
  "https://api.github.com/users/Archont561/repos?per_page=100&type=owner&sort=full_name";
export const REPOSITORY_SNAPSHOT = "data/repositories.json";
export type RepositoryFetcher = (url: string, options: RequestInit) => Promise<Response>;

export interface Repository {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  fork: boolean;
  topics: string[];
}
export interface RepositorySnapshot {
  source: string;
  retrieved: string;
  repositories: Repository[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

/** Project only public, stable fields; sort so API ordering cannot create drift. */
export function projectRepositories(records: unknown, retrieved: string): RepositorySnapshot {
  if (!Array.isArray(records)) throw new Error("GitHub repository response must be an array");
  if (!isIsoDate(retrieved)) throw new Error("Repository snapshot needs an ISO capture date");
  const repositories = records
    .map((record: unknown): Repository => {
      if (
        !isRecord(record) ||
        typeof record.name !== "string" ||
        !record.name ||
        typeof record.html_url !== "string" ||
        typeof record.fork !== "boolean" ||
        !(record.description === null || typeof record.description === "string") ||
        !(record.language === null || typeof record.language === "string") ||
        !Array.isArray(record.topics) ||
        record.topics.some((topic: unknown) => typeof topic !== "string")
      ) {
        throw new Error(
          "Invalid GitHub repository record (name, URL, language, fork and topics are required)",
        );
      }
      return {
        name: record.name,
        description: record.description,
        html_url: record.html_url,
        language: record.language,
        fork: record.fork,
        topics: [...record.topics].sort() as string[],
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "en"));
  if (new Set(repositories.map((record) => record.name.toLowerCase())).size !== repositories.length)
    throw new Error("Duplicate repository names in GitHub response");
  return { source: REPOSITORY_SOURCE, retrieved, repositories };
}

export function repositorySignals(repositories: Repository[]) {
  const languages = new Map<string, number>();
  for (const item of repositories)
    if (item.language) languages.set(item.language, (languages.get(item.language) ?? 0) + 1);
  return {
    owned: repositories.length,
    forks: repositories.filter((item) => item.fork).length,
    titled: repositories.filter((item) => item.topics.length > 0).length,
    languages: Object.fromEntries(
      [...languages].sort(([a, ac], [b, bc]) => bc - ac || a.localeCompare(b)).slice(0, 4),
    ),
  };
}

async function repositoryPage(url: string, fetcher: RepositoryFetcher): Promise<Response> {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  let response: Response;
  try {
    response = await fetcher(url, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "archont561-repo-watch",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      signal: AbortSignal.timeout(30_000),
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
  return response;
}

/** Follow all pages, rather than silently truncating an account with over 100 repos. */
export async function retrieveRepositories(fetcher: RepositoryFetcher = fetch): Promise<unknown[]> {
  const records: unknown[] = [];
  for (let page = 1; page <= 100; page++) {
    const url = `${REPOSITORY_SOURCE}&page=${page}`;
    const response = await repositoryPage(url, fetcher);
    const batch: unknown = await response.json();
    if (!Array.isArray(batch)) throw new Error(`${url}: expected an array`);
    records.push(...batch);
    if (!/rel="next"/.test(response.headers.get("link") ?? "")) return records;
  }
  throw new Error("GitHub repository pagination exceeded 100 pages");
}

export function checkRepositorySnapshot(root: string): RepositorySnapshot {
  const file = join(root, REPOSITORY_SNAPSHOT);
  if (!pathExists(file))
    throw new Error(`${REPOSITORY_SNAPSHOT} is missing; run tools watch-repos`);
  const snapshot: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (
    !isRecord(snapshot) ||
    snapshot.source !== REPOSITORY_SOURCE ||
    typeof snapshot.retrieved !== "string"
  )
    throw new Error(`${REPOSITORY_SNAPSHOT}: invalid source or capture date`);
  return projectRepositories(snapshot.repositories, snapshot.retrieved);
}

/** Preserve the committed capture date and file bytes when only the date changes. */
export async function refreshRepositories(
  root: string,
  options: { records?: unknown; retrieved?: string; fetcher?: RepositoryFetcher } = {},
): Promise<boolean> {
  const records = options.records ?? (await retrieveRepositories(options.fetcher));
  const snapshot = projectRepositories(
    records,
    options.retrieved ?? new Date().toISOString().slice(0, 10),
  );
  const file = join(root, REPOSITORY_SNAPSHOT);
  if (pathExists(file)) {
    const old = checkRepositorySnapshot(root);
    if (JSON.stringify(old.repositories) === JSON.stringify(snapshot.repositories)) return false;
  }
  mkdirSync(join(root, "data"), { recursive: true });
  return updateTextFile(file, `${JSON.stringify(snapshot, null, 2)}\n`, false);
}
