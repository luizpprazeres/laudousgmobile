import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import type { ChangelogBody, ChangelogEntry, ChangelogFrontmatter } from "./types";

const CHANGELOG_DIR = path.join(process.cwd(), "..", "..", "docs", "changelog");

function splitBody(raw: string): ChangelogBody {
  const lines = raw.split("\n");
  const sections: Record<string, string[]> = { leigo: [], tecnico: [], impacto: [] };
  let current: keyof ChangelogBody | null = null;

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (line.startsWith("## ") && lower.includes("resumo")) {
      current = "leigo";
      continue;
    }
    if (line.startsWith("## ") && lower.includes("detalhes")) {
      current = "tecnico";
      continue;
    }
    if (line.startsWith("## ") && (lower.includes("impacto") || lower.includes("próximos") || lower.includes("proximos"))) {
      current = "impacto";
      continue;
    }
    if (current) sections[current]!.push(line);
  }

  return {
    leigo: sections.leigo!.join("\n").trim(),
    tecnico: sections.tecnico!.join("\n").trim(),
    impacto: sections.impacto!.join("\n").trim(),
  };
}

export const getAllChangelog = cache((): ChangelogEntry[] => {
  if (!fs.existsSync(CHANGELOG_DIR)) return [];

  const files = fs
    .readdirSync(CHANGELOG_DIR)
    .filter((f) => f.endsWith(".md") && !f.startsWith("_"));

  const entries: ChangelogEntry[] = files.map((file) => {
    const raw = fs.readFileSync(path.join(CHANGELOG_DIR, file), "utf-8");
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;
    const dateValue = fm.date;
    const dateStr =
      dateValue instanceof Date
        ? dateValue.toISOString().slice(0, 10)
        : String(dateValue ?? "");
    return {
      ...(fm as ChangelogFrontmatter),
      date: dateStr,
      body: splitBody(parsed.content),
    };
  });

  return entries.sort((a, b) => b.date.localeCompare(a.date));
});

export const getChangelogBySlug = cache((slug: string): ChangelogEntry | null => {
  return getAllChangelog().find((e) => e.slug === slug) ?? null;
});

export function getChangelogStats(entries: ChangelogEntry[]) {
  return {
    total: entries.length,
    shipped: entries.filter((e) => e.status === "shipped").length,
    inProgress: entries.filter((e) => e.status === "in-progress").length,
    planned: entries.filter((e) => e.status === "planned").length,
  };
}
