import { Fragment, useMemo } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

/**
 * Renderer de markdown minimalista para os documentos legais (sem lib externa).
 * Suporta: # a #### títulos, > blockquote, listas -/* e numeradas, --- hr,
 * tabelas | a | b |, **negrito** e [links](url). O resto vira parágrafo.
 */

type Block =
  | { kind: "heading"; level: number; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "quote"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] }
  | { kind: "hr" };

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split("\n");
  const blocks: Block[] = [];
  let i = 0;

  const flushParagraph = (buf: string[]) => {
    const text = buf.join(" ").trim();
    if (text) blocks.push({ kind: "paragraph", text });
    buf.length = 0;
  };

  const para: string[] = [];
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph(para);
      i++;
      continue;
    }
    const heading = trimmed.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph(para);
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2] });
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      flushParagraph(para);
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }
    if (trimmed.startsWith(">")) {
      flushParagraph(para);
      const quote: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quote.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ kind: "quote", lines: quote.filter(Boolean) });
      continue;
    }
    if (trimmed.startsWith("|")) {
      flushParagraph(para);
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableLines.push(lines[i].trim());
        i++;
      }
      const cells = (row: string) =>
        row
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
      const [headerLine, ...rest] = tableLines;
      const rows = rest
        .filter((r) => !/^\|?[\s:|-]+\|?$/.test(r)) // pula linha separadora ---
        .map(cells);
      blocks.push({ kind: "table", header: cells(headerLine), rows });
      continue;
    }
    const unordered = trimmed.match(/^[-*]\s+(.*)$/);
    const ordered = trimmed.match(/^\d+[.)]\s+(.*)$/);
    if (unordered || ordered) {
      flushParagraph(para);
      const isOrdered = Boolean(ordered);
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        const m = isOrdered ? t.match(/^\d+[.)]\s+(.*)$/) : t.match(/^[-*]\s+(.*)$/);
        if (!m) break;
        items.push(m[1]);
        i++;
      }
      blocks.push({ kind: "list", ordered: isOrdered, items });
      continue;
    }
    para.push(trimmed);
    i++;
  }
  flushParagraph(para);
  return blocks;
}

/** Renderiza **negrito** e [texto](url) dentro de uma linha. */
function InlineText({
  text,
  style,
  t,
}: {
  text: string;
  style: object | object[];
  t: ColorTokens;
}) {
  const parts = text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g).filter(Boolean);
  return (
    <Text selectable style={style}>
      {parts.map((part, idx) => {
        const bold = part.match(/^\*\*([^*]+)\*\*$/);
        if (bold) {
          return (
            <Text key={idx} style={{ fontFamily: FONT.bold }}>
              {bold[1]}
            </Text>
          );
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
          const [, label, url] = link;
          const external = /^https?:/.test(url);
          return (
            <Text
              key={idx}
              style={{ color: t.brand, textDecorationLine: "underline" }}
              onPress={external ? () => Linking.openURL(url) : undefined}
            >
              {label}
            </Text>
          );
        }
        return <Fragment key={idx}>{part}</Fragment>;
      })}
    </Text>
  );
}

export function MarkdownLite({ markdown }: { markdown: string }) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const blocks = useMemo(() => parseBlocks(markdown), [markdown]);

  return (
    <View style={{ gap: 10 }}>
      {blocks.map((block, idx) => {
        switch (block.kind) {
          case "heading": {
            const headingStyle =
              block.level === 1
                ? styles.h1
                : block.level === 2
                  ? styles.h2
                  : styles.h3;
            return <InlineText key={idx} text={block.text} style={headingStyle} t={t} />;
          }
          case "hr":
            return <View key={idx} style={styles.hr} />;
          case "quote":
            return (
              <View key={idx} style={styles.quote}>
                {block.lines.map((line, li) => (
                  <InlineText key={li} text={line} style={styles.quoteText} t={t} />
                ))}
              </View>
            );
          case "list":
            return (
              <View key={idx} style={{ gap: 6 }}>
                {block.items.map((item, li) => (
                  <View key={li} style={styles.listItem}>
                    <Text style={styles.bullet}>
                      {block.ordered ? `${li + 1}.` : "•"}
                    </Text>
                    <View style={{ flex: 1 }}>
                      <InlineText text={item} style={styles.body} t={t} />
                    </View>
                  </View>
                ))}
              </View>
            );
          case "table":
            return (
              <View key={idx} style={{ gap: 8 }}>
                {block.rows.map((row, ri) => (
                  <View key={ri} style={styles.tableRow}>
                    {row.map((cell, ci) => (
                      <View key={ci} style={{ marginBottom: ci === 0 ? 2 : 0 }}>
                        {ci === 0 ? (
                          <InlineText text={cell} style={styles.tableTitle} t={t} />
                        ) : (
                          <InlineText
                            text={
                              block.header[ci] && block.header.length > 2
                                ? `${block.header[ci].replace(/\*\*/g, "")}: ${cell}`
                                : cell
                            }
                            style={styles.tableCell}
                            t={t}
                          />
                        )}
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            );
          case "paragraph":
          default:
            return <InlineText key={idx} text={block.text} style={styles.body} t={t} />;
        }
      })}
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    h1: {
      color: t.text,
      fontFamily: FONT.displayBold,
      fontSize: 20,
      marginTop: 6,
    },
    h2: {
      color: t.text,
      fontFamily: FONT.bold,
      fontSize: 16,
      marginTop: 8,
    },
    h3: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 14,
      marginTop: 4,
    },
    body: {
      color: t.text,
      fontFamily: FONT.body,
      fontSize: 13,
      lineHeight: 20,
    },
    quote: {
      borderLeftWidth: 3,
      borderLeftColor: t.brand,
      backgroundColor: t.fill2,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 2,
    },
    quoteText: {
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 12.5,
      lineHeight: 19,
    },
    listItem: {
      flexDirection: "row",
      gap: 8,
    },
    bullet: {
      color: t.textSec,
      fontFamily: FONT.semibold,
      fontSize: 13,
      lineHeight: 20,
      minWidth: 16,
      textAlign: "right",
    },
    hr: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: t.separator,
      marginVertical: 4,
    },
    tableRow: {
      backgroundColor: t.fill2,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    tableTitle: {
      color: t.text,
      fontFamily: FONT.semibold,
      fontSize: 13,
      lineHeight: 19,
    },
    tableCell: {
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 12.5,
      lineHeight: 19,
    },
  });
}
