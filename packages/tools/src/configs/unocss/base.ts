export { createTokensPreset, parseTokensCss } from "./tokens.ts";

/** Small custom-rule preset; the portfolio can add its own rules in M4. */
export function createUnoPreset() {
  const rules: [string, Record<string, string>][] = [
    [
      "sr-only",
      {
        position: "absolute",
        width: "1px",
        height: "1px",
        padding: "0",
        margin: "-1px",
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        "white-space": "nowrap",
        "border-width": "0",
      },
    ],
  ];
  return { name: "@archont561/base", rules };
}
