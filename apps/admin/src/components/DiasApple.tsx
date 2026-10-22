import { Cartao, Tabela } from "./ui";
import type { DadosPainel } from "@/lib/data/tipos";
import { int } from "@/lib/formato";
export function DiasApple({
  m,
}: {
  m: NonNullable<DadosPainel["aquisicao"]["apple_dias"]>;
}) {
  return (
    <Cartao
      titulo="Instalações por dia"
      sub="Primeiras instalações e reinstalações · — = não publicado"
      m={m}
    >
      <Tabela
        cab={["Dia Apple", "Primeiras", "Reinstalações"]}
        linhas={m.v.map((r) => [r.day, int(r.primeiras), int(r.reinstalacoes)])}
        numericas={[1, 2]}
      />
    </Cartao>
  );
}
