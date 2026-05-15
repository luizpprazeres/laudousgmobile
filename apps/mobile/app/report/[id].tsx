import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";

/**
 * STUB: detalhe do laudo. Próxima sessão:
 *  - fetch report via supabase-js (RLS aplica)
 *  - tabs: Laudo | Entendido (JSON) | RAG usado | Metadados (admin)
 *  - botões: copiar / exportar / compartilhar
 */
export default function ReportDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <View style={{ flex: 1, padding: 24 }}>
      <Text style={{ fontSize: 22, fontWeight: "600" }}>Laudo {id}</Text>
      <Text style={{ marginTop: 12, color: "#888" }}>
        Detalhe completo virá na próxima iteração.
      </Text>
    </View>
  );
}
