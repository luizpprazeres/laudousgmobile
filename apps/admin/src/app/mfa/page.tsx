import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { emailPermitido } from "@/lib/auth/acesso";
import { sessaoDoServidor } from "@/lib/auth/servidor";
import { comBase } from "@/lib/base";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Verificação — LaudoUSG Admin" };

const ERROS: Record<string, string> = { "1": "Código inválido. Tente de novo.", limite: "Muitas tentativas. Espere alguns minutos." };

export default async function Mfa({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { erro } = await searchParams;
  const { cfg, sessao } = await sessaoDoServidor();
  if (!cfg || !sessao) notFound();
  const { data } = await sessao.auth.getUser();
  if (!data.user) redirect("/login");
  if (!emailPermitido(data.user.email, cfg.allowlist)) notFound();

  const aal = await sessao.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal.data?.currentLevel === "aal2") redirect("/");

  const fatores = await sessao.auth.mfa.listFactors();
  const verificado = fatores.data?.totp.find((f) => f.status === "verified");

  let factorId = verificado?.id ?? null;
  let qr: string | null = null;
  let segredo: string | null = null;
  if (!verificado) {
    // Cadastro do TOTP só quando o servidor permite (ADMIN_ALLOW_MFA_ENROLL=true, GO G8).
    if (!cfg.permitirCadastroMfa) {
      return (
        <div className="auth-wrap">
          <div className="auth-card">
            <h1>MFA não configurado</h1>
            <p>Esta conta ainda não tem app autenticador. O cadastro está fechado no servidor; peça para liberá-lo uma única vez.</p>
            <form method="post" action={comBase("/api/auth/logout")}><button className="botao" type="submit">Sair</button></form>
          </div>
        </div>
      );
    }
    for (const f of fatores.data?.all ?? []) {
      if (f.factor_type === "totp" && f.status !== "verified") await sessao.auth.mfa.unenroll({ factorId: f.id });
    }
    const novo = await sessao.auth.mfa.enroll({ factorType: "totp", friendlyName: "LaudoUSG Admin" });
    if (novo.error || !novo.data) notFound();
    factorId = novo.data.id;
    qr = novo.data.totp.qr_code;
    segredo = novo.data.totp.secret;
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" method="post" action={comBase("/api/auth/mfa")}>
        <span className="brand-mark" aria-hidden="true">L</span>
        <h1>{qr ? "Cadastre o app autenticador" : "Código de verificação"}</h1>
        <p>{qr ? "Leia o QR no app autenticador e digite o código de 6 dígitos." : "Digite o código de 6 dígitos do app autenticador."}</p>
        {erro ? <div className="erro" role="alert">{ERROS[erro] ?? ERROS["1"]}</div> : null}
        {qr ? (
          <>
            <div className="qr">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="QR code para o app autenticador" />
            </div>
            <p className="segredo" title="Chave para digitar à mão">{segredo}</p>
          </>
        ) : null}
        <input type="hidden" name="factorId" value={factorId ?? ""} />
        <label className="campo">Código<input className="codigo" name="codigo" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required autoFocus /></label>
        <button className="botao" type="submit">Verificar</button>
      </form>
    </div>
  );
}
