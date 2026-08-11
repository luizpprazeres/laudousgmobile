import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { PageHeader } from "@/ui/PageHeader";
import { useColorTokens } from "@/ui/useColorTokens";
import { ModeloEditor } from "@/features/biblioteca/ModeloEditor";
import { CATEGORIAS_COM_MODELO } from "@/lib/personalizacao";

/**
 * Biblioteca — os modelos de laudo do médico.
 *
 * Era um "em breve". Agora é onde ele ajusta o modelo padrão de cada categoria:
 * trocar a redação de uma frase, tirar uma que não usa, acrescentar outra.
 *
 * Só aparecem aqui as categorias que têm catálogo no backend. Uma categoria
 * sem catálogo não tem slot a que ancorar uma alteração, e mostrar um editor
 * que não pode salvar seria pior do que não mostrar nada.
 */
export default function BibliotecaScreen() {
  const t = useColorTokens();
  const [categoria, setCategoria] = useState(CATEGORIAS_COM_MODELO[0]?.code ?? "OBSTETRICA");

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Biblioteca" />

      {CATEGORIAS_COM_MODELO.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 8 }}
        >
          {CATEGORIAS_COM_MODELO.map((c) => {
            const ativa = c.code === categoria;
            return (
              <Pressable
                key={c.code}
                onPress={() => setCategoria(c.code)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 7,
                  borderRadius: 999,
                  backgroundColor: ativa ? t.brand : t.fill2,
                }}
              >
                <Text style={{ color: ativa ? "#fff" : t.text2, fontSize: 13, fontWeight: "600" }}>
                  {c.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ModeloEditor categoria={categoria} />
    </View>
  );
}
