#!/usr/bin/env node
/**
 * Gera src/legal/documents.ts a partir de assets/legal/*.md (fonte única).
 * - Remove comentários HTML (notas internas) para não embarcarem no bundle.
 * - Extrai a versão de cada documento da linha "> **Versão:** X.Y".
 *
 * Uso: npm run sync-legal   (rodar sempre que editar os .md)
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const DOCS = [
  { id: "terms", title: "Termos de Uso", file: "terms-of-use.md" },
  { id: "privacy", title: "Política de Privacidade", file: "privacy-policy.md" },
  { id: "disclaimer", title: "Disclaimer Médico", file: "medical-disclaimer.md" },
];

function loadDoc(file) {
  let md = readFileSync(join(root, "assets/legal", file), "utf8");
  md = md.replace(/<!--[\s\S]*?-->/g, ""); // notas internas fora do bundle
  md = md.replace(/\n{3,}/g, "\n\n").trim();
  const version = md.match(/\*\*Versão:\*\*\s*([\d.]+)/)?.[1];
  if (!version) throw new Error(`Versão não encontrada em ${file}`);
  return { md, version };
}

const loaded = DOCS.map((d) => ({ ...d, ...loadDoc(d.file) }));

const out = `// GERADO por scripts/sync-legal.mjs — NÃO editar à mão.
// Fonte: assets/legal/*.md. Rode \`npm run sync-legal\` após editar os .md.

export type LegalDocId = 'terms' | 'privacy' | 'disclaimer';

export type LegalDocument = {
  id: LegalDocId;
  title: string;
  version: string;
  body: string;
};

/** Versões vigentes — devem casar com as colunas *_version_accepted em profiles (gate legal). */
export const LEGAL_VERSIONS = {
${loaded.map((d) => `  ${d.id}: ${JSON.stringify(d.version)},`).join("\n")}
} as const;

export const LEGAL_DOCUMENTS: LegalDocument[] = [
${loaded
  .map(
    (d) => `  {
    id: ${JSON.stringify(d.id)},
    title: ${JSON.stringify(d.title)},
    version: ${JSON.stringify(d.version)},
    body: ${JSON.stringify(d.md)},
  },`,
  )
  .join("\n")}
];

export const SHORT_MEDICAL_DISCLAIMER = 'Minuta gerada por IA — revise, valide clinicamente e edite antes de assinar. Você é o responsável.';
`;

writeFileSync(join(root, "src/legal/documents.ts"), out);
console.log(
  "documents.ts gerado:",
  loaded.map((d) => `${d.id}@${d.version}`).join(", "),
);
