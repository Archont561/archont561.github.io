import { Highlight, type PrismTheme } from "prism-react-renderer";
import { Fragment, type ReactNode } from "react";

const theme: PrismTheme = {
  plain: { color: "var(--color-text)", backgroundColor: "transparent" },
  styles: [
    { types: ["tag", "selector", "property"], style: { color: "var(--color-syntax-tag)" } },
    { types: ["attr-name", "keyword"], style: { color: "var(--color-syntax-attribute)" } },
    {
      types: ["attr-value", "string", "number", "boolean"],
      style: { color: "var(--color-syntax-value)" },
    },
    {
      types: ["punctuation", "comment", "prolog", "doctype"],
      style: { color: "var(--color-syntax-punctuation)" },
    },
  ],
};

function CodeFrame({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section
      className="site-file-code-scroll"
      aria-label={`${label} source`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Keyboard users must be able to scroll long source lines.
      tabIndex={0}
    >
      <pre className="site-file-code">
        <code className="site-file-code-inner">{children}</code>
      </pre>
    </section>
  );
}

/** Prism tokenizes source as React text, never as executable HTML. */
export default function SiteFileCode({
  source,
  language,
  label,
}: {
  source: string;
  language: "markup" | "json" | "text";
  label: string;
}) {
  if (language === "text") return <CodeFrame label={label}>{source}</CodeFrame>;
  // Prism normalizes token lines, so restore the source's original line breaks.
  const lineBreaks = source.match(/\r\n|\r|\n/g) ?? [];
  return (
    <Highlight theme={theme} code={source} language={language}>
      {({ tokens, getLineProps, getTokenProps }) => (
        <CodeFrame label={label}>
          {tokens.map((line, lineIndex) => (
            // Lines are an immutable rendering of one file and cannot be reordered.
            // biome-ignore lint/suspicious/noArrayIndexKey: the source is replaced as a whole.
            <Fragment key={lineIndex}>
              <span {...getLineProps({ line })}>
                {line.map((token, tokenIndex) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: tokens are immutable within a source line.
                  <span key={tokenIndex} {...getTokenProps({ token })}>
                    {token.empty ? "" : token.content}
                  </span>
                ))}
              </span>
              {lineBreaks[lineIndex] ?? null}
            </Fragment>
          ))}
        </CodeFrame>
      )}
    </Highlight>
  );
}
