import { Pressable, ScrollView, Text, View } from "react-native";
import { useColorTokens } from "@/ui/useColorTokens";
import type { VersaoPersonalizacao } from "@/lib/personalizacao";

/**
 * As versões anteriores do modelo do médico.
 *
 * Publicar não sobrescreve: a versão anterior é arquivada e continua legível.
 * Aqui isso deixa de ser detalhe de banco e vira algo que ele pode usar —
 * voltar ao que tinha antes, sem perder o que tem agora.
 *
 * Restaurar cria um RASCUNHO, nunca publica direto: o modelo-base pode ter
 * mudado desde então, e é melhor a validação aparecer antes de o laudo mudar.
 */

type Props = {
  historico: VersaoPersonalizacao[];
  publicadaVersao: number | null;
  onRestaurar: (versao: number) => void;
};

function rotulo(status: string): string {
  if (status === "published") return "em uso";
  if (status === "draft") return "rascunho";
  return "arquivada";
}

function dataCurta(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("pt-BR", { day: "numeric", month: "long" });
}

export function HistoricoSheet({ historico, publicadaVersao, onRestaurar }: Props) {
  const t = useColorTokens();
  const versoes = [...historico].sort((a, b) => b.versao - a.versao);

  if (versoes.length === 0) {
    return (
      <Text style={{ color: t.textSec, fontSize: 14, lineHeight: 20 }}>
        Você ainda não publicou nenhuma versão. Quando publicar, as anteriores ficam
        guardadas aqui.
      </Text>
    );
  }

  return (
    <View style={{ gap: 8 }}>
      <Text style={{ color: t.text, fontSize: 15, fontWeight: "700" }}>
        Versões do seu modelo
      </Text>
      <Text style={{ color: t.textGhost, fontSize: 12, lineHeight: 17 }}>
        Nada é apagado. Trazer uma de volta cria um rascunho — você revisa antes de
        passar a usar.
      </Text>

      <ScrollView style={{ maxHeight: 320 }}>
        {versoes.map((v, i) => {
          const atual = v.versao === publicadaVersao;
          return (
            <View
              key={v.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                paddingVertical: 12,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: t.separator,
                gap: 10,
              }}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ color: t.text, fontSize: 14, fontWeight: "600" }}>
                    Versão {v.versao}
                  </Text>
                  <Text
                    style={{
                      color: atual ? t.brand : t.textGhost,
                      fontSize: 11,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      borderRadius: 999,
                      overflow: "hidden",
                      backgroundColor: atual ? t.brandLight : t.fill2,
                    }}
                  >
                    {rotulo(v.status)}
                  </Text>
                </View>
                <Text style={{ color: t.textSec, fontSize: 12 }}>
                  {v.operations.length} alteração(ões)
                  {dataCurta(v.publishedAt) ? ` · ${dataCurta(v.publishedAt)}` : ""}
                </Text>
                {v.baseDesatualizado && (
                  <Text style={{ color: t.warningText, fontSize: 11 }}>
                    escrita sobre uma versão anterior do modelo padrão
                  </Text>
                )}
              </View>
              {!atual && (
                <Pressable onPress={() => onRestaurar(v.versao)} hitSlop={8}>
                  <Text style={{ color: t.brand, fontSize: 13, fontWeight: "600" }}>
                    Trazer de volta
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
