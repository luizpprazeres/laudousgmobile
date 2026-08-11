import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useColorTokens } from "@/ui/useColorTokens";
import type { Previa } from "@/lib/personalizacao";

/**
 * Como o laudo fica de verdade.
 *
 * A tela de edição mostra o modelo frase a frase, o que é bom para mexer e
 * ruim para julgar: o médico não reconhece o próprio laudo numa lista de
 * frases soltas. Aqui ele vê o texto inteiro, do jeito que sai — e pode trocar
 * de cenário para conferir o gemelar, a gestação inicial, o oligoâmnio.
 *
 * O que ele mudou aparece destacado. O resto é o modelo padrão.
 */

type Props = { previas: Previa[] };

/** Linhas que a personalização acrescentou ou reescreveu, para destacar. */
function linhasAlteradas(p: Previa): Set<string> {
  const set = new Set<string>();
  for (const m of p.mudancas) {
    for (const linha of (m.depois ?? "").split("\n")) {
      const t = linha.trim();
      if (t !== "") set.add(t);
    }
  }
  return set;
}

export function LaudoPreview({ previas }: Props) {
  const t = useColorTokens();
  const [cenario, setCenario] = useState(previas[0]?.cenario ?? "");

  const atual = useMemo(
    () => previas.find((p) => p.cenario === cenario) ?? previas[0],
    [previas, cenario],
  );

  const alteradas = useMemo(() => (atual ? linhasAlteradas(atual) : new Set<string>()), [atual]);

  if (!atual) {
    return (
      <Text style={{ color: t.textSec, fontSize: 14, padding: 16 }}>
        Ainda não há como mostrar o laudo desta categoria.
      </Text>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* cenários */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 7, paddingHorizontal: 16, paddingBottom: 10 }}
      >
        {previas.map((p) => {
          const ativo = p.cenario === atual.cenario;
          return (
            <Pressable
              key={p.cenario}
              onPress={() => setCenario(p.cenario)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: ativo ? (p.patologico ? t.warningText : t.brand) : t.fill2,
              }}
            >
              <Text
                style={{
                  color: ativo ? "#fff" : t.text2,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                {p.nome}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {atual.mudou ? (
        <Text style={{ color: t.brand, fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 }}>
          Em verde, o que você mudou.
        </Text>
      ) : (
        <Text style={{ color: t.textSec, fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 }}>
          Neste caso o seu laudo sai igual ao modelo padrão.
        </Text>
      )}

      {/* o laudo */}
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: 0, paddingBottom: 40 }}>
        <View
          style={{
            backgroundColor: t.card,
            borderRadius: 12,
            padding: 14,
          }}
        >
          {atual.laudo_personalizado.split("\n").map((linha, i) => {
            const limpa = linha.trim();
            const destaque = limpa !== "" && alteradas.has(limpa);
            // Cabeçalhos de seção vêm em caixa alta e terminam em ":"
            const cabecalho = /^[A-ZÀ-Ú\s]{4,}:?$/.test(limpa);
            return (
              <Text
                key={i}
                style={{
                  color: destaque ? t.brand : t.text,
                  fontSize: 14,
                  lineHeight: 22,
                  fontWeight: cabecalho ? "700" : destaque ? "600" : "400",
                  backgroundColor: destaque ? t.brandLight : "transparent",
                }}
              >
                {linha === "" ? " " : linha}
              </Text>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
