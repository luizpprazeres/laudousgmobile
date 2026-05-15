import { StyleSheet, Text, View } from "react-native";
import { PageHeader } from "@/ui/PageHeader";
import { Sparkle } from "@/ui/icons";
import { C, FONT } from "@/ui/tokens";

export default function BibliotecaScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <PageHeader title="Biblioteca" />
      <View style={styles.center}>
        <View style={styles.iconBox}>
          <Sparkle size={24} color={C.textMute} />
        </View>
        <Text style={styles.title}>Biblioteca</Text>
        <Text style={styles.subtitle}>
          Suas referências clínicas favoritas — em desenvolvimento.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: C.fill1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    color: C.text,
    fontFamily: FONT.semibold,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: C.textSec,
    fontFamily: FONT.body,
    marginTop: 8,
    maxWidth: 260,
    lineHeight: 20, // 14 * 1.45 ≈ 20.3
    textAlign: "center",
  },
});
