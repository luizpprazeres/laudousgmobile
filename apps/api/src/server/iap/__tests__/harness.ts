/** Mini-harness dos gates manuais do IAP: `check` acumula, `finish` decide. */

let falhas = 0;
let total = 0;

export function check(nome: string, ok: boolean, detalhe?: unknown): void {
  total++;
  if (!ok) falhas++;
  const extra = !ok && detalhe !== undefined ? ` — ${formatar(detalhe)}` : "";
  console.log(`  ${ok ? "✓" : "✗"} ${nome}${extra}`);
}

export async function checkThrows<T>(
  nome: string,
  fn: () => Promise<T>,
  pred: (erro: unknown) => boolean,
): Promise<void> {
  try {
    const valor = await fn();
    check(nome, false, { esperavaErro: true, recebeu: valor });
  } catch (erro) {
    check(nome, pred(erro), erro);
  }
}

export function section(titulo: string): void {
  console.log(`\n${titulo}`);
}

export function finish(): void {
  console.log(`\n${total - falhas}/${total} verificações passaram`);
  if (falhas > 0) {
    console.error(`✗ ${falhas} falha(s)`);
    process.exit(1);
  }
}

function formatar(v: unknown): string {
  if (v instanceof Error) {
    const status = (v as { status?: unknown }).status;
    return `${v.name}: ${v.message}${status !== undefined ? ` (status ${String(status)})` : ""}`;
  }
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
