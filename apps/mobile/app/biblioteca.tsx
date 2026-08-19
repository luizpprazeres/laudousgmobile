import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { PageHeader } from "@/ui/PageHeader";
import { useColorTokens } from "@/ui/useColorTokens";
import { ModeloEditor } from "@/features/biblioteca/ModeloEditor";
import { listarCategorias, type CategoriaDaBiblioteca } from "@/lib/personalizacao";

/**
 * Biblioteca — os modelos de laudo do médico.
 *
 * Era um "em breve". Agora é onde ele ajusta o modelo padrão de cada categoria:
 * trocar a redação de uma frase, tirar uma que não usa, acrescentar outra.
 *
 * A lista de categorias vem do SERVIDOR. Estava cravada aqui, com uma entrada
 * só, e por isso o médico continuava vendo apenas o modelo obstétrico depois
 * que o backend passou a servir treze — o mesmo defeito que o app iOS tinha.
 */
export default function BibliotecaScreen() {
  const t = useColorTokens();
  const [cats, setCats] = useState<CategoriaDaBiblioteca[] | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    void listarCategorias().then((cs) => {
      if (!vivo) return;
      setCats(cs);
      setCategoria((atual) => atual ?? cs[0]?.categoria ?? null);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Biblioteca" />

      {cats === null ? (
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={t.brand} />
        </View>
      ) : (
        <>
          {cats.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
            >
              {cats.map((c) => {
                const ativa = c.categoria === categoria;
                return (
                  <Pressable
                    key={c.categoria}
                    onPress={() => setCategoria(c.categoria)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      borderRadius: 999,
                      backgroundColor: ativa ? t.brand : t.fill2,
                    }}
                  >
                    <Text
                      style={{
                        color: ativa ? "#fff" : t.text2,
                        fontSize: 13,
                        fontWeight: "600",
                      }}
                    >
                      {c.rotulo}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          {categoria ? <ModeloEditor categoria={categoria} /> : null}
        </>
      )}
    </View>
  );
}
