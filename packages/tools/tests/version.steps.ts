import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { withState } from "@aboviq/bun-test-cucumber";
import type { PackageMeta } from "@/src/package-meta/index.ts";
import { readPackageMeta } from "@/src/package-meta/index.ts";

interface State {
  root?: string;
  manifest?: Record<string, unknown>;
  modulePath?: string;
  meta?: PackageMeta;
  second?: PackageMeta;
  error?: unknown;
}

const { Given, Then, When } = withState<State>();

const requireRoot = (state: State): string => {
  if (!state.root) throw new Error("scenario is missing the temporary workspace step");
  return state.root;
};

const writePackage = (state: State): string => {
  const root = requireRoot(state);
  const modulePath = state.modulePath ?? "src/index.ts";
  mkdirSync(join(root, dirname(modulePath)), { recursive: true });
  writeFileSync(join(root, "package.json"), JSON.stringify(state.manifest ?? {}, null, 2));
  return join(root, modulePath);
};

Given("a temporary workspace", () => {
  const root = join(
    process.env.TEST_TMPDIR ?? "/tmp",
    `pkg-meta-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  mkdirSync(root, { recursive: true });
  return { root };
});

Given(/^a package "([^"]+)" at version "([^"]+)"$/, (state, [name, version]) => ({
  ...state,
  manifest: { name, version },
}));

Given(
  /^a package "([^"]+)" at version "([^"]+)" with extra field "([^"]+)"$/,
  (state, [name, version, field]) => ({
    ...state,
    manifest: { name, version, [String(field)]: "kept" },
  }),
);

Given("a package manifest without a name", (state) => ({
  ...state,
  manifest: { version: "1.0.0" },
}));

Given(/^a module "([^"]+)" inside that package$/, (state, [modulePath]) => {
  state.modulePath = String(modulePath);
  writePackage(state);
  return state;
});

When(/^I read the package meta from that module$/, (state) => {
  state.meta = readPackageMeta(writePackage(state));
  return state;
});

When(/^I read the package meta from that module twice$/, (state) => {
  const modulePath = writePackage(state);
  state.meta = readPackageMeta(modulePath);
  state.second = readPackageMeta(modulePath);
  return state;
});

When(/^I try to read the package meta from that module$/, (state) => {
  try {
    state.meta = readPackageMeta(writePackage(state));
    state.error = undefined;
  } catch (error) {
    state.error = error;
  }
  return state;
});

Then(/^the meta name is "([^"]+)"$/, (state, [name]) => {
  if (state.meta?.name !== name) {
    throw new Error(`expected meta name "${name}", got ${JSON.stringify(state.meta?.name)}`);
  }
  return state;
});

Then(/^the meta version is "([^"]+)"$/, (state, [version]) => {
  if (state.meta?.version !== version) {
    throw new Error(
      `expected meta version "${version}", got ${JSON.stringify(state.meta?.version)}`,
    );
  }
  return state;
});

Then(/^the read fails with an error mentioning "([^"]+)"$/, (state, [needle]) => {
  if (state.error === undefined) {
    throw new Error("expected the read to fail, but it succeeded");
  }
  const message = String((state.error as Error).message);
  if (!message.includes(String(needle))) {
    throw new Error(`expected error mentioning "${needle}", got: ${message}`);
  }
  return state;
});

Then(/^the raw field "([^"]+)" is "([^"]+)"$/, (state, [field, value]) => {
  if (state.meta?.raw[String(field)] !== value) {
    throw new Error(
      `expected raw.${field} to be "${value}", got ${JSON.stringify(state.meta?.raw[String(field)])}`,
    );
  }
  return state;
});

Then("both reads return the same instance", (state) => {
  if (state.meta === undefined || state.meta !== state.second) {
    throw new Error("expected both reads to return the identical PackageMeta instance");
  }
  return state;
});
