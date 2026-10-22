"use client";
/**
 * Envio em lote das artes (story admin-instagram-quadro). O nome do arquivo define o destino:
 * `<id-do-post>-<slide>.jpg` (ex.: s1-02-3.jpg → s1-02, slide 3; st-1026-1.jpg → story st-1026-1).
 * Prévia do mapeamento antes de enviar (JPEG de verdade e dimensão conferidos no navegador); depois,
 * um arquivo por vez para a rota de upload que já existe (POST /admin/api/social/midia), que valida tudo
 * de novo. Prévias (-v1, -v2…), a pasta _fontes e arquivos ocultos são ignorados.
 */
import { useRouter } from "next/navigation";
import { useRef, useState, type DragEvent } from "react";
import { comBase } from "@/lib/base";
import { classificarArquivos, dimensaoExigida, MENSAGEM_ARQUIVO, type Catalogo, type Classificacao } from "@/lib/social/quadro";
import { dimensoesJpeg, MENSAGEM_IMAGEM, validarImagem } from "@/lib/social/regras";
import { ROTULO_FORMATO } from "@/lib/social/tipos";

interface Entrada {
  arquivo: File | null;
  caminho: string;
}
interface Linha {
  chave: number;
  arquivo: File | null;
  cls: Classificacao;
  /** Conteúdo conferido no navegador: null = ok; texto = problema. undefined = ainda não conferido. */
  conteudo?: string | null;
  envio?: "fila" | "enviando" | "ok" | string;
}

const LEITURA_INICIAL = 512 * 1024;

const MENSAGEM_ENVIO: Record<string, string> = {
  ok: "Enviada.",
  status: "O post saiu do rascunho; não enviada.",
  slide: "Slide não encontrado.",
  nao_encontrado: "Post não encontrado.",
  falha: "O banco ou o Storage não respondeu.",
  sessao: "A sessão expirou ou o pedido foi recusado. Recarregue a página.",
  rede: "Falha de rede.",
  grande413: "Recusada pelo servidor por tamanho (limite de ~4,5 MB por envio).",
  ...MENSAGEM_IMAGEM,
};

/** Confere assinatura JPEG e dimensão sem decodificar (lê o começo; se o SOF estiver depois, lê tudo). */
async function conferirConteudo(f: File, formato: Parameters<typeof validarImagem>[2]): Promise<string | null> {
  const tipo = f.type || "image/jpeg";
  const ler = async (n: number) => new Uint8Array(await f.slice(0, n).arrayBuffer());
  let bytes = await ler(LEITURA_INICIAL);
  let v = validarImagem(bytes, tipo, formato);
  if (!v.ok && v.erro === "tipo" && f.size > bytes.length) {
    bytes = await ler(f.size);
    v = validarImagem(bytes, tipo, formato);
  }
  if (v.ok) return null;
  if (v.erro === "dimensao") {
    const d = dimensoesJpeg(bytes);
    return `Tamanho ${d ? `${d.largura}×${d.altura}` : "desconhecido"}; ${ROTULO_FORMATO[formato].toLowerCase()} pede ${dimensaoExigida(formato)}.`;
  }
  if (v.erro === "tipo") return "O conteúdo não é JPEG (ou o arquivo está corrompido).";
  return MENSAGEM_IMAGEM[v.erro];
}

/** Arquivos e pastas soltos na área (pastas lidas recursivamente; _fontes nem é aberta). */
async function entradasDoDrop(dt: DataTransfer): Promise<Entrada[]> {
  const raizes = [...dt.items].map((i) => (i.kind === "file" ? i.webkitGetAsEntry?.() ?? null : null));
  if (!raizes.some(Boolean)) return [...dt.files].map((f) => ({ arquivo: f, caminho: f.name }));
  const saida: Entrada[] = [];
  const andar = async (e: FileSystemEntry, prefixo: string): Promise<void> => {
    if (e.isFile) {
      const f = await new Promise<File>((ok, falha) => (e as FileSystemFileEntry).file(ok, falha));
      saida.push({ arquivo: f, caminho: `${prefixo}${f.name}` });
      return;
    }
    if (!e.isDirectory) return;
    if (e.name.toLowerCase() === "_fontes") {
      saida.push({ arquivo: null, caminho: `${prefixo}_fontes/(pasta)` });
      return;
    }
    const leitor = (e as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const lote = await new Promise<FileSystemEntry[]>((ok, falha) => leitor.readEntries(ok, falha));
      if (!lote.length) break;
      for (const x of lote) await andar(x, `${prefixo}${e.name}/`);
    }
  };
  for (const r of raizes) if (r) await andar(r, "");
  return saida;
}

const pastaProps = { webkitdirectory: "", directory: "" } as Record<string, string>;

export function EnvioLote({ catalogo }: { catalogo: Catalogo }) {
  const router = useRouter();
  const [linhas, setLinhas] = useState<Linha[]>([]);
  const [analisando, setAnalisando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState<{ feitos: number; total: number } | null>(null);
  const [sobre, setSobre] = useState(false);
  const parar = useRef(false);
  const seq = useRef(0);

  async function analisar(entradas: Entrada[]) {
    if (enviando) return;
    setAnalisando(true);
    setProgresso(null);
    const cls = classificarArquivos(entradas.map((e) => ({ caminho: e.caminho, tamanho: e.arquivo?.size ?? 0 })), catalogo).map((c, k) =>
      // A pasta _fontes solta inteira entra como uma linha só, já ignorada.
      entradas[k]!.arquivo ? c : ({ ok: false, caminho: entradas[k]!.caminho, motivo: "fontes", ignorado: true } as Classificacao),
    );
    const novas: Linha[] = cls.map((c, k) => ({ chave: ++seq.current, arquivo: entradas[k]!.arquivo, cls: c }));
    setLinhas(novas);
    for (const l of novas) {
      if (!l.cls.ok || !l.arquivo) continue;
      const problema = await conferirConteudo(l.arquivo, l.cls.formato).catch(() => "Não deu para ler o arquivo.");
      setLinhas((ls) => ls.map((x) => (x.chave === l.chave ? { ...x, conteudo: problema } : x)));
    }
    setAnalisando(false);
  }

  const prontas = linhas.filter((l) => l.cls.ok && l.conteudo === null && l.envio !== "ok");
  const problemas = linhas.filter((l) => (!l.cls.ok && !l.cls.ignorado) || (l.cls.ok && typeof l.conteudo === "string"));
  const ignorados = linhas.filter((l) => !l.cls.ok && l.cls.ignorado);
  const validas = linhas.filter((l) => l.cls.ok && l.conteudo === null);

  async function enviar() {
    if (enviando || !prontas.length) return;
    parar.current = false;
    setEnviando(true);
    const fila = prontas.map((l) => l.chave);
    setLinhas((ls) => ls.map((x) => (fila.includes(x.chave) ? { ...x, envio: "fila" } : x)));
    setProgresso({ feitos: 0, total: fila.length });
    for (let k = 0; k < fila.length; k++) {
      if (parar.current) break;
      const l = linhas.find((x) => x.chave === fila[k]);
      if (!l || !l.cls.ok || !l.arquivo) continue;
      const { id, posicao } = l.cls;
      setLinhas((ls) => ls.map((x) => (x.chave === l.chave ? { ...x, envio: "enviando" } : x)));
      let resultado = "falha";
      try {
        const f = new FormData();
        f.append("id", id);
        f.append("posicao", String(posicao));
        f.append("arquivo", new File([l.arquivo], `${id}-${posicao}.jpg`, { type: "image/jpeg" }));
        const r = await fetch(comBase("/api/social/midia"), { method: "POST", body: f, headers: { Accept: "application/json" }, credentials: "same-origin", cache: "no-store" });
        if (r.status === 404) resultado = "sessao";
        else if (r.status === 413) resultado = "grande413";
        else resultado = String(((await r.json().catch(() => ({}))) as { resultado?: unknown }).resultado ?? "falha");
      } catch {
        resultado = "rede";
      }
      setLinhas((ls) => ls.map((x) => (x.chave === l.chave ? { ...x, envio: resultado } : x)));
      setProgresso({ feitos: k + 1, total: fila.length });
      if (resultado === "sessao") break;
    }
    setLinhas((ls) => ls.map((x) => (x.envio === "fila" ? { ...x, envio: undefined } : x)));
    setEnviando(false);
    router.refresh();
  }

  const soltar = async (e: DragEvent) => {
    e.preventDefault();
    setSobre(false);
    // Os itens do DataTransfer só valem durante o evento: entradasDoDrop lê as raízes antes do primeiro await.
    await analisar(await entradasDoDrop(e.dataTransfer));
  };
  const escolher = (lista: FileList | null) => {
    if (!lista?.length) return;
    void analisar([...lista].map((f) => ({ arquivo: f, caminho: f.webkitRelativePath || f.name })));
  };

  const enviadas = linhas.filter((l) => l.envio === "ok").length;
  const falhasEnvio = linhas.filter((l) => l.envio && !["ok", "fila", "enviando"].includes(l.envio)).length;

  return (
    <details className="card qd-envio" open={linhas.length > 0 || undefined}>
      <summary className="qd-envio-sum">
        <b>Enviar imagens em lote</b>
        <span className="qd-sub">Solte os arquivos ou a pasta. O nome define o destino: <code>s1-02-3.jpg</code> → post s1-02, slide 3; <code>st-1026-1.jpg</code> → story st-1026-1.</span>
      </summary>
      <div className="card-body">
        <div
          className={`qd-soltar${sobre ? " sobre" : ""}`}
          onDragOver={(e) => {
            if (![...e.dataTransfer.types].includes("Files")) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
            setSobre(true);
          }}
          onDragLeave={() => setSobre(false)}
          onDrop={soltar}
        >
          <p>Solte aqui os JPEGs ou a pasta <code>output/instagram</code> inteira.</p>
          <div className="qd-soltar-botoes">
            <label className="botao sec">
              Escolher arquivos
              <input type="file" multiple accept=".jpg,.jpeg,image/jpeg" className="visually-hidden" onChange={(e) => (escolher(e.target.files), (e.target.value = ""))} disabled={enviando} />
            </label>
            <label className="botao sec">
              Escolher pasta
              <input type="file" multiple {...pastaProps} className="visually-hidden" onChange={(e) => (escolher(e.target.files), (e.target.value = ""))} disabled={enviando} />
            </label>
          </div>
          <p className="qd-sub">Só JPEG; feed em 1080×1350 e story em 1080×1920; até 4,4 MB por arquivo. Só posts em rascunho. Prévias (<code>-v2</code>…), a pasta <code>_fontes</code> e nomes fora do padrão ficam de fora.</p>
        </div>

        {linhas.length ? (
          <>
            <div className="qd-envio-barra" role="status">
              <span>
                <b>{validas.length}</b> {validas.length === 1 ? "imagem pronta" : "imagens prontas"} · <b>{problemas.length}</b> com problema · {ignorados.length} ignorados
                {analisando ? " · conferindo arquivos…" : ""}
              </span>
              {enviando ? (
                <button type="button" className="botao sec" onClick={() => (parar.current = true)}>Parar depois desta</button>
              ) : (
                <>
                  <button type="button" className="botao" onClick={enviar} disabled={analisando || !prontas.length}>
                    Enviar {prontas.length} {prontas.length === 1 ? "imagem" : "imagens"}
                  </button>
                  <button type="button" className="botao sec" onClick={() => (setLinhas([]), setProgresso(null))}>Limpar lista</button>
                </>
              )}
            </div>
            {progresso ? (
              <div className="qd-progresso">
                <progress value={progresso.feitos} max={progresso.total} aria-label="Progresso do envio" />
                <span>{progresso.feitos} de {progresso.total}{!enviando ? ` · ${enviadas} enviadas${falhasEnvio ? `, ${falhasEnvio} com falha` : ""}` : ""}</span>
              </div>
            ) : null}
            <table className="qd-mapa">
              <thead>
                <tr><th scope="col">Arquivo</th><th scope="col">Destino</th><th scope="col">Situação</th></tr>
              </thead>
              <tbody>
                {[...validas, ...problemas].map((l) => <LinhaMapa key={l.chave} l={l} />)}
              </tbody>
            </table>
            {ignorados.length ? (
              <details className="qd-ignorados">
                <summary>{ignorados.length} {ignorados.length === 1 ? "arquivo ignorado" : "arquivos ignorados"}</summary>
                <ul className="ig-lista">
                  {ignorados.slice(0, 300).map((l) => <li key={l.chave}><code>{l.cls.caminho}</code>: {!l.cls.ok ? MENSAGEM_ARQUIVO[l.cls.motivo] : ""}</li>)}
                </ul>
              </details>
            ) : null}
          </>
        ) : null}
      </div>
    </details>
  );
}

function LinhaMapa({ l }: { l: Linha }) {
  const c = l.cls;
  const destino = c.ok ? `${c.id} · slide ${c.posicao}` : c.id ? `${c.id}${c.posicao ? ` · slide ${c.posicao}` : ""}` : "—";
  let situacao: string;
  let classe = "ok";
  if (!c.ok) {
    situacao = MENSAGEM_ARQUIVO[c.motivo];
    classe = "err";
  } else if (l.envio && l.envio !== "fila") {
    situacao = l.envio === "enviando" ? "Enviando…" : MENSAGEM_ENVIO[l.envio] ?? "Falhou.";
    classe = l.envio === "ok" ? "ok" : l.envio === "enviando" ? "warn" : "err";
  } else if (l.conteudo === undefined) {
    situacao = "Conferindo…";
    classe = "neutral";
  } else if (l.conteudo) {
    situacao = l.conteudo;
    classe = "err";
  } else {
    situacao = c.substitui ? "OK (substitui a imagem atual)" : "OK";
    classe = l.envio === "fila" ? "neutral" : "ok";
  }
  return (
    <tr>
      <td><code>{c.caminho}</code></td>
      <td>{destino}</td>
      <td><span className={`tag ${classe}`}>{situacao}</span></td>
    </tr>
  );
}
