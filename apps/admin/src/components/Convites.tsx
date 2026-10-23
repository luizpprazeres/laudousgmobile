"use client";
/**
 * Formulário de convite (fetch JSON) e o resultado com o texto pronto. A senha provisória só existe
 * no estado deste componente: some ao recarregar a página ou ao criar outro convite.
 */
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { comBase } from "@/lib/base";
import { DIAS_PADRAO, MENSAGEM_ERRO_CONVITE, UFS, dataBR, mailto, textoConvite } from "@/lib/convites/regras";

interface Resultado {
  resultado: "criada" | "existente";
  nome: string;
  email: string;
  fim: string;
  senha?: string;
}

const MSG_SESSAO = "A sessão expirou ou o pedido foi recusado. Recarregue a página e entre de novo.";

export function ResultadoConvite({ r }: { r: Resultado }) {
  const [copiado, setCopiado] = useState(false);
  const { assunto, corpo } = textoConvite({ nome: r.nome, email: r.email, senha: r.senha ?? null, fim: r.fim });
  async function copiar() {
    try {
      await navigator.clipboard.writeText(corpo);
      setCopiado(true);
    } catch {
      setCopiado(false);
    }
  }
  return (
    <section className="card convite-resultado" aria-live="polite">
      <div className="card-body">
        <div className="callout" role="status">
          {r.resultado === "criada" ? (
            <>Conta criada para <b>{r.email}</b> com o Pro liberado até <b>{dataBR(r.fim)}</b>. A senha aparece só aqui: copie o convite agora.</>
          ) : (
            <>A conta já existia: só liberei o Pro para <b>{r.email}</b> até <b>{dataBR(r.fim)}</b>. A senha dele não mudou.</>
          )}
        </div>
        <label className="campo">
          Convite pronto
          <textarea readOnly rows={16} value={corpo} />
        </label>
        <div className="convite-acoes">
          <button type="button" className="botao" onClick={copiar}>{copiado ? "Copiado" : "Copiar"}</button>
          <a className="botao sec" href={mailto(r.email, assunto, corpo)}>Abrir no e-mail</a>
        </div>
      </div>
    </section>
  );
}

export function FormConvite() {
  const router = useRouter();
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function enviar(ev: FormEvent<HTMLFormElement>) {
    ev.preventDefault();
    const form = ev.currentTarget;
    const f = new FormData(form);
    const corpo = Object.fromEntries(["nome", "email", "crm", "uf", "dias"].map((k) => [k, String(f.get(k) ?? "")]));
    setEnviando(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await fetch(comBase("/api/convites/criar"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(corpo),
        credentials: "same-origin",
        cache: "no-store",
      });
      if (r.status === 404) throw new Error(MSG_SESSAO);
      const j = (await r.json().catch(() => ({}))) as Partial<Resultado> & { erro?: keyof typeof MENSAGEM_ERRO_CONVITE };
      if (!r.ok || !j.resultado) throw new Error(MENSAGEM_ERRO_CONVITE[j.erro ?? "pedido"] ?? "Algo falhou.");
      setResultado(j as Resultado);
      form.reset();
      router.refresh();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Algo falhou.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <section className="card">
        <div className="card-body">
          <form className="convite-form" onSubmit={enviar}>
            <label className="campo">Nome<input name="nome" required maxLength={120} autoComplete="off" /></label>
            <label className="campo">E-mail<input name="email" type="email" required maxLength={254} autoComplete="off" /></label>
            <label className="campo">CRM (opcional)<input name="crm" inputMode="numeric" pattern="\d{4,10}" title="Só o número, de 4 a 10 dígitos" autoComplete="off" /></label>
            <label className="campo">
              UF do CRM
              <select name="uf" defaultValue="">
                <option value="">—</option>
                {UFS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </label>
            <label className="campo">Dias de Pro<input name="dias" type="number" min={1} max={365} defaultValue={DIAS_PADRAO} required /></label>
            <div className="convite-enviar">
              <button type="submit" className="botao" disabled={enviando}>{enviando ? "Criando…" : "Criar convite"}</button>
            </div>
          </form>
          {erro ? <div className="callout warn" role="alert">{erro}</div> : null}
        </div>
      </section>
      {resultado ? <ResultadoConvite r={resultado} /> : null}
    </>
  );
}
