// Loads every Gherkin spec into `bun test`. The runner itself is registered by
// tests/cucumber-preload.ts (see bunfig.toml).
import { loadFeatures } from "@aboviq/bun-test-cucumber";

await loadFeatures("features/**/*.feature");
