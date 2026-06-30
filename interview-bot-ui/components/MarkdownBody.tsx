"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTheme } from "./ThemeProvider";

interface Props {
  content: string;
}

export default function MarkdownBody({ content }: Props) {
  const C = useTheme();
  const isLight = C.mode === "light";

  const codeInlineBg = isLight ? "rgba(15,23,42,0.06)" : "rgba(255,255,255,0.06)";
  const codeBlockBg  = isLight ? "#f8fafc" : "#0f0f14";
  const codeBlockBorder = isLight ? "#e2e8f0" : "#26262f";
  const codeText     = isLight ? "#0f172a" : "#e8e8ef";
  const tableHeadBg  = isLight ? "#f1f5f9" : "rgba(255,255,255,0.04)";
  const tableBorder  = isLight ? "#e2e8f0" : "#2a2a33";
  const quoteBorder  = C.amberBorder;
  const quoteBg      = C.amberBg;
  const linkColor    = C.amber;

  return (
    <div
      className="md-body"
      style={{
        fontSize: 14.5,
        lineHeight: 1.75,
        color: C.text,
        fontFamily: "inherit",
      }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => (
            <p style={{ margin: "0 0 12px", lineHeight: 1.75 }}>{children}</p>
          ),

          strong: ({ children }) => (
            <strong style={{ color: C.boldHighlight, fontWeight: 600 }}>
              {children}
            </strong>
          ),

          em: ({ children }) => (
            <em style={{ color: C.subtle, fontStyle: "italic" }}>{children}</em>
          ),

          h1: ({ children }) => (
            <h1 style={{
              fontSize: 18, fontWeight: 700, color: C.text,
              margin: "24px 0 10px", lineHeight: 1.3,
            }}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 style={{
              fontSize: 16, fontWeight: 700, color: C.text,
              margin: "20px 0 8px", lineHeight: 1.3,
            }}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 style={{
              fontSize: 14.5, fontWeight: 600, color: C.amber,
              margin: "16px 0 6px", lineHeight: 1.3,
            }}>{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 style={{
              fontSize: 13.5, fontWeight: 600, color: C.subtle,
              margin: "14px 0 4px", textTransform: "uppercase", letterSpacing: "0.04em",
            }}>{children}</h4>
          ),

          ul: ({ children }) => (
            <ul style={{
              margin: "4px 0 14px",
              paddingLeft: 22,
              listStyle: "none",
            }}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol style={{
              margin: "4px 0 14px",
              paddingLeft: 24,
              listStyleType: "decimal",
              color: C.text,
            }}>{children}</ol>
          ),
          li: ({ children, ...rest }) => {
            // GFM checkbox lists pass a `checked` prop on the underlying node
            const checked = (rest as { checked?: boolean | null }).checked;
            if (typeof checked === "boolean") {
              return (
                <li style={{
                  position: "relative", paddingLeft: 24,
                  margin: "4px 0", listStyle: "none",
                }}>
                  <span style={{
                    position: "absolute", left: 0, top: 3,
                    display: "inline-block", width: 14, height: 14,
                    borderRadius: 3,
                    border: `1.5px solid ${checked ? C.amber : C.border}`,
                    background: checked ? C.amber : "transparent",
                    color: isLight ? "#fff" : "#0d0d0f",
                    fontSize: 11, lineHeight: "11px",
                    textAlign: "center",
                  }}>
                    {checked ? "✓" : ""}
                  </span>
                  {children}
                </li>
              );
            }
            return (
              <li style={{
                position: "relative", paddingLeft: 4,
                margin: "4px 0",
              }}>
                <span style={{
                  position: "absolute", left: -16, top: 0,
                  color: C.listBullet, fontWeight: 700,
                }}>•</span>
                {children}
              </li>
            );
          },

          blockquote: ({ children }) => (
            <blockquote style={{
              margin: "12px 0",
              padding: "10px 14px",
              borderLeft: `3px solid ${quoteBorder}`,
              background: quoteBg,
              borderRadius: "0 8px 8px 0",
              color: C.subtle,
              fontStyle: "normal",
            }}>{children}</blockquote>
          ),

          hr: () => (
            <hr style={{
              border: "none",
              borderTop: `1px solid ${C.border}`,
              margin: "20px 0",
            }} />
          ),

          a: ({ children, href }) => (
            <a
              href={href}
              target={href?.startsWith("http") ? "_blank" : undefined}
              rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
              style={{
                color: linkColor,
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              {children}
            </a>
          ),

          code: ({ className, children, ...rest }) => {
            const isBlock = className?.startsWith("language-");
            if (!isBlock) {
              return (
                <code
                  {...rest}
                  style={{
                    background: codeInlineBg,
                    color: C.boldHighlight,
                    padding: "1.5px 6px",
                    borderRadius: 5,
                    fontSize: "0.875em",
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    border: `1px solid ${tableBorder}`,
                  }}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                {...rest}
                className={className}
                style={{
                  fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                  fontSize: 13,
                  color: codeText,
                  lineHeight: 1.6,
                  whiteSpace: "pre",
                }}
              >
                {children}
              </code>
            );
          },

          pre: ({ children, ...rest }) => {
            // Extract language label from the inner <code> if present
            type CodeChild = { props?: { className?: string } };
            const child = children as CodeChild;
            const langMatch = /language-(\w+)/.exec(child?.props?.className ?? "");
            const lang = langMatch ? langMatch[1] : null;
            return (
              <div style={{ position: "relative", margin: "12px 0" }}>
                {lang && (
                  <div style={{
                    position: "absolute", top: 8, right: 10,
                    fontSize: 10, fontWeight: 600,
                    letterSpacing: "0.05em", textTransform: "uppercase",
                    color: C.muted,
                    pointerEvents: "none",
                  }}>
                    {lang}
                  </div>
                )}
                <pre
                  {...rest}
                  style={{
                    background: codeBlockBg,
                    border: `1px solid ${codeBlockBorder}`,
                    borderRadius: 8,
                    padding: "12px 14px",
                    margin: 0,
                    overflowX: "auto",
                    fontSize: 13,
                    lineHeight: 1.6,
                  }}
                >
                  {children}
                </pre>
              </div>
            );
          },

          table: ({ children }) => (
            <div style={{
              overflowX: "auto",
              margin: "12px 0",
              border: `1px solid ${tableBorder}`,
              borderRadius: 8,
            }}>
              <table style={{
                borderCollapse: "collapse",
                width: "100%",
                fontSize: 13,
              }}>
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead style={{ background: tableHeadBg }}>{children}</thead>
          ),
          th: ({ children, style }) => (
            <th style={{
              textAlign: "left",
              ...style,
              padding: "8px 10px",
              fontWeight: 600,
              color: C.text,
              borderBottom: `1px solid ${tableBorder}`,
              whiteSpace: "nowrap",
            }}>{children}</th>
          ),
          td: ({ children, style }) => (
            <td style={{
              ...style,
              padding: "8px 10px",
              borderTop: `1px solid ${tableBorder}`,
              color: C.text,
              verticalAlign: "top",
            }}>{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
