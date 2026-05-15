import { View } from "react-native";
import { PageHeader } from "@/ui/PageHeader";
import { EmptyState } from "@/ui/EmptyState";
import { Book } from "@/ui/icons";
import { useColorTokens } from "@/ui/useColorTokens";

export default function BibliotecaScreen() {
  const t = useColorTokens();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Biblioteca" />
      <EmptyState
        icon={<Book size={28} color={t.brand} />}
        badge="Em breve"
        title="Suas referências clínicas"
        message="Marque modelos, protocolos e frases favoritas para reusar com um toque durante a ditado."
      />
    </View>
  );
}
