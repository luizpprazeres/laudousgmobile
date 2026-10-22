import type { Metadata } from "next";
import { comBase } from "@/lib/base";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Entrar — LaudoUSG Admin" };

const ERROS: Record<string, string> = {
  "1": "E-mail ou senha inválidos.",
  limite: "Muitas tentativas. Espere alguns minutos.",
};

export default async function Login({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { erro } = await searchParams;
  return (
    <div className="auth-wrap">
      <form className="auth-card" method="post" action={comBase("/api/auth/login")}>
        <span className="brand-mark" aria-hidden="true">L</span>
        <h1>Entrar</h1>
        <p>Acesso restrito. Depois da senha, o código do app autenticador é obrigatório.</p>
        {erro ? <div className="erro" role="alert">{ERROS[erro] ?? ERROS["1"]}</div> : null}
        <label className="campo">E-mail<input name="email" type="email" autoComplete="username" required /></label>
        <label className="campo">Senha<input name="senha" type="password" autoComplete="current-password" required /></label>
        <button className="botao" type="submit">Continuar</button>
      </form>
    </div>
  );
}
