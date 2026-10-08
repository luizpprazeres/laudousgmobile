/**
 * QA visual/funcional dos realces sincronizados da Sala.
 * SALA_ORIGIN=http://127.0.0.1:3100 \
 * PLAYWRIGHT_MODULE=/Users/luizprazeres/laudousg/node_modules/playwright \
 * pnpm exec tsx --tsconfig apps/api/tsconfig.json apps/web/tests/salaReviewSignals.browser.manual.ts
 */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";

const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const origin = process.env.SALA_ORIGIN ?? "http://127.0.0.1:3100";
const shots = process.env.SALA_REVIEW_SHOTS;
if (shots) mkdirSync(shots, { recursive: true });

const report = {
  id: "10000000-0000-4000-8000-000000000001",
  outputText: "ULTRASSONOGRAFIA DO ABDOME\n\nRim direito medindo 123 cm.\nBexiga com volume de ____ mL.",
  category: "ABDOME_TOTAL",
  createdAt: "2026-10-08T11:30:00.000Z",
  contentRevision: 4,
  reviewStatus: "reviewed",
  reviewedAt: "2026-10-08T11:35:00.000Z",
  reviewSignals: {
    highlights: [
      { id: "missing", kind: "missing", anchor: "____", message: "Informação pendente.", severity: "critical" },
      { id: "magnitude", kind: "warning", anchor: "123 cm", message: "Magnitude improvável; confira a unidade.", severity: "warning" },
    ],
    notices: [{ id: "general", message: "Achado ditado não localizado no texto.", severity: "critical" }],
  },
};

async function main() {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      const errors: string[] = [];
      page.on("pageerror", (error: Error) => errors.push(error.message));
      await page.route("**/api/sala/**", async (route: any) => {
        const url = route.request().url();
        if (url.includes("/schemas")) return route.fulfill({ json: { schemas: [] } });
        if (url.includes("/annotations")) return route.fulfill({ json: { annotations: [] } });
        if (url.includes("/phrases")) return route.fulfill({ json: { phrases: [] } });
        return route.fulfill({ json: {
          tokenValid: true,
          tokenExpiresAt: "2027-10-08T12:00:00.000Z",
          report,
          reportsToday: [{
            id: report.id,
            category: report.category,
            createdAt: report.createdAt,
            contentRevision: report.contentRevision,
            reviewStatus: report.reviewStatus,
            reviewedAt: report.reviewedAt,
          }],
        } });
      });
      await page.goto(`${origin}/sala/ABC234`, { waitUntil: "networkidle" });
      await page.locator(".review-mark--warning").waitFor();
      assert.equal(await page.locator(".review-mark--warning").textContent(), "123 cm");
      assert.equal(await page.locator(".review-mark--missing").textContent(), "____");
      assert.match(await page.locator(".review-banner").innerText(), /revisado/i);
      assert.equal(await page.getByText(/pontos? a revisar/i).count(), 0);
      assert.match(await page.locator(".review-notices").innerText(), /1 aviso sem trecho específico/);
      const colors = await page.locator(".review-mark").evaluateAll((nodes: HTMLElement[]) => nodes.map((node) => getComputedStyle(node).backgroundColor));
      assert.equal(new Set(colors).size, 2, "roxo e amarelo precisam ser visualmente distintos");
      await page.locator(".review-mark--warning").focus();
      await page.waitForTimeout(180);
      const tooltipOpacity = await page.locator(".review-mark--warning").evaluate((node: HTMLElement) => getComputedStyle(node, "::after").opacity);
      assert.equal(tooltipOpacity, "1");
      assert.deepEqual(errors, []);
      if (shots) await page.screenshot({ path: `${shots}/sala-review-${width}.png`, fullPage: true });
      console.log(`sala review signals ${width}px: ok`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
