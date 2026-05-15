import { View } from "react-native";
import { PageHeader } from "@/ui/PageHeader";
import { EmptyState } from "@/ui/EmptyState";
import { Shield } from "@/ui/icons";
import { useColorTokens } from "@/ui/useColorTokens";

export default function SegurancaScreen() {
  const t = useColorTokens();
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Segurança" />
      <EmptyState
        icon={<Shield size={28} color={t.brand} />}
        badge="Em breve"
        title="Sessões e auditoria"
        message="2FA, sessões ativas em outros dispositivos e log de exportações de laudo aparecem aqui."
      />
    </View>
  );
}
