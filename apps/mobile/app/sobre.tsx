import { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LEGAL_DOCUMENTS,
  type LegalDocId,
} from "@/legal/documents";
import { MarkdownLite } from "@/ui/MarkdownLite";
import { PageHeader } from "@/ui/PageHeader";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

const INITIAL_DOC: LegalDocId = "terms";

export default function SobreScreen() {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<LegalDocId>(INITIAL_DOC);
  const current =
    LEGAL_DOCUMENTS.find((doc) => doc.id === selected) ?? LEGAL_DOCUMENTS[0];

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <PageHeader title="Sobre / Legal" />

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 32 + insets.bottom,
        }}
      >
        <View style={styles.headerCard}>
          <Text style={styles.appName}>LaudoUSG</Text>
          <Text style={styles.appSubtitle}>
            Laudos médicos com IA para ultrassonografia.
          </Text>
          <Text style={styles.contact}>Contato: contato@laudousg.com</Text>
        </View>

        <View style={styles.tabs}>
          {LEGAL_DOCUMENTS.map((doc) => {
            const active = doc.id === current.id;
            return (
              <Pressable
                key={doc.id}
                onPress={() => setSelected(doc.id)}
                style={[styles.tab, active && styles.tabActive]}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {doc.title}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.documentCard}>
          <MarkdownLite markdown={current.body} />
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    headerCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 16,
      gap: 4,
    },
    appName: {
      color: t.text,
      fontFamily: FONT.displayBold,
      fontSize: 28,
    },
    appSubtitle: {
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 14,
      lineHeight: 20,
    },
    contact: {
      color: t.textSec,
      fontFamily: FONT.body,
      fontSize: 13,
      marginTop: 6,
    },
    tabs: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
      marginTop: 14,
      marginBottom: 12,
    },
    tab: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 999,
      backgroundColor: t.fill1,
    },
    tabActive: {
      backgroundColor: t.brand,
    },
    tabText: {
      color: t.textSec,
      fontFamily: FONT.semibold,
      fontSize: 13,
    },
    tabTextActive: {
      color: "#fff",
    },
    documentCard: {
      backgroundColor: t.card,
      borderRadius: 14,
      padding: 16,
    },
  });
}
