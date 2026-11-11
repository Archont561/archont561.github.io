import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const lineSchema = z
  .string()
  .trim()
  .min(1)
  .refine((value) => !/[\r\n]/.test(value), {
    message: "Must be a single line",
  });
const categorySchema = z.strictObject({ id: slugSchema, label: lineSchema });
const descriptionSourceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("github"), captured: z.iso.date() }),
  z.strictObject({ kind: z.literal("legacy-github"), captured: z.iso.date() }),
  z.strictObject({ kind: z.literal("curated") }),
]);
const projectSchema = z
  .strictObject({
    repository: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    category: slugSchema,
    order: z.number().int().nonnegative(),
    descriptionOverride: lineSchema.optional(),
    descriptionSource: descriptionSourceSchema.optional(),
    directorySummary: lineSchema.optional(),
    metadataCategory: lineSchema.optional(),
    featured: z.strictObject({ home: z.boolean() }),
  })
  .refine(
    (project) => Boolean(project.descriptionOverride) === Boolean(project.descriptionSource),
    {
      message: "Description overrides and their source must be supplied together",
      path: ["descriptionSource"],
    },
  );
const snapshotSchema = z.object({
  retrieved: z.iso.date(),
  repositories: z.array(
    z.object({
      name: lineSchema,
      html_url: z.url(),
      description: z.string().nullable(),
      language: lineSchema.nullable(),
      topics: z.array(z.string()),
    }),
  ),
});

type Category = z.infer<typeof categorySchema>;
type ProjectInput = z.infer<typeof projectSchema> & { slug: string; notes: string };
type Repository = z.infer<typeof snapshotSchema>["repositories"][number];
type SnapshotIndex = { retrieved: string; byUrl: Map<string, Repository> };

export type CatalogProject = {
  slug: string;
  name: string;
  categoryId: string;
  category: string;
  description: string;
  directorySummary: string;
  metadataCategory: string;
  descriptionSource:
    | z.infer<typeof descriptionSourceSchema>
    | { kind: "snapshot"; captured: string };
  language: string | null;
  url: string;
  topics: string[];
  featured: { home: boolean };
  repositoryCaptured: string | null;
  notes: string;
  number: number;
};

export type ProjectCatalog = { categories: Category[]; projects: CatalogProject[] };

function readValidated<T>(path: string, schema: z.ZodType<T>): T {
  try {
    return schema.parse(JSON.parse(readFileSync(path, "utf8")) as unknown);
  } catch (error) {
    throw new Error(`Invalid project data in ${path}: ${String(error)}`, { cause: error });
  }
}

function categoriesFrom(root: string): Category[] {
  const categories = readValidated(
    join(root, "data/project-categories.json"),
    z.array(categorySchema).min(1),
  );
  const ids = new Set<string>();
  const labels = new Set<string>();
  for (const category of categories) {
    const label = category.label.toLowerCase();
    if (ids.has(category.id) || labels.has(label) || label === "all projects") {
      throw new Error(`Duplicate or reserved project category: ${category.label}`);
    }
    ids.add(category.id);
    labels.add(label);
  }
  return categories;
}

function inputFrom(directory: string, file: string): ProjectInput {
  const slug = file.slice(0, -".json".length);
  if (!slugSchema.safeParse(slug).success || slug === "index" || slug === "meta") {
    throw new Error(`Invalid or reserved project slug: ${slug}`);
  }
  const input = readValidated(join(directory, file), projectSchema);
  if (input.repository.split("/").some((part) => part === "." || part === "..")) {
    throw new Error(`Invalid repository identity for ${slug}: ${input.repository}`);
  }
  const notesPath = join(directory, `${slug}.mdx`);
  const notes = existsSync(notesPath) ? readFileSync(notesPath, "utf8").trim() : "";
  return { ...input, slug, notes };
}

function inputsFrom(root: string): ProjectInput[] {
  const directory = join(root, "data/projects");
  const files = readdirSync(directory)
    .filter((file) => file.endsWith(".json"))
    .sort();
  if (!files.length) throw new Error("No project records found in data/projects");
  const inputs = files.map((file) => inputFrom(directory, file));
  const slugs = new Set(inputs.map((input) => input.slug));
  for (const file of readdirSync(directory).filter((entry) => entry.endsWith(".mdx"))) {
    if (!slugs.has(file.slice(0, -".mdx".length))) {
      throw new Error(`Project notes have no matching JSON record: ${file}`);
    }
  }
  return inputs;
}

function snapshotFrom(root: string): SnapshotIndex {
  const snapshot = readValidated(join(root, "data/repositories.json"), snapshotSchema);
  const byUrl = new Map<string, Repository>();
  for (const repository of snapshot.repositories) {
    const url = repository.html_url.toLowerCase();
    if (byUrl.has(url)) throw new Error(`Duplicate repository in snapshot: ${repository.html_url}`);
    byUrl.set(url, repository);
  }
  return { retrieved: snapshot.retrieved, byUrl };
}

function orderedInputs(inputs: ProjectInput[], categories: Category[]): ProjectInput[] {
  const positions = new Map(categories.map((category, index) => [category.id, index]));
  const usedOrders = new Set<string>();
  for (const input of inputs) {
    if (!positions.has(input.category))
      throw new Error(`Unknown category for ${input.slug}: ${input.category}`);
    const key = `${input.category}:${input.order}`;
    if (usedOrders.has(key))
      throw new Error(`Duplicate project order in ${input.category}: ${input.order}`);
    usedOrders.add(key);
  }
  return inputs.toSorted(
    (a, b) =>
      (positions.get(a.category) ?? 0) - (positions.get(b.category) ?? 0) ||
      a.order - b.order ||
      a.slug.localeCompare(b.slug, "en"),
  );
}

function resolveProject(
  input: ProjectInput,
  category: Category,
  snapshot: SnapshotIndex,
): CatalogProject {
  const fallbackUrl = `https://github.com/${input.repository}`;
  const repository = snapshot.byUrl.get(fallbackUrl.toLowerCase());
  const description = lineSchema.safeParse(input.descriptionOverride ?? repository?.description);
  if (!description.success) {
    throw new Error(
      `No usable snapshot description for ${input.slug}; provide a descriptionOverride and descriptionSource or refresh the repository snapshot.`,
    );
  }
  return {
    slug: input.slug,
    name: repository?.name ?? input.repository.split("/")[1] ?? input.slug,
    categoryId: category.id,
    category: category.label,
    description: description.data,
    directorySummary: input.directorySummary ?? description.data,
    metadataCategory: input.metadataCategory ?? category.label,
    descriptionSource: input.descriptionSource ?? {
      kind: "snapshot",
      captured: snapshot.retrieved,
    },
    language: repository?.language ?? null,
    url: repository?.html_url ?? fallbackUrl,
    topics: repository?.topics ?? [],
    featured: input.featured,
    repositoryCaptured: repository ? snapshot.retrieved : null,
    notes: input.notes,
    number: 0,
  };
}

/** Read curated projects and committed repository facts. No network requests are made. */
export function loadProjectCatalog(root: string): ProjectCatalog {
  const categories = categoriesFrom(root);
  const snapshot = snapshotFrom(root);
  const inputs = orderedInputs(inputsFrom(root), categories);
  const byId = new Map(categories.map((category) => [category.id, category]));
  const projects = inputs.map((input, index) => {
    const category = byId.get(input.category);
    if (!category) throw new Error(`Unknown category: ${input.category}`);
    return { ...resolveProject(input, category, snapshot), number: index + 1 };
  });
  return { categories, projects };
}
