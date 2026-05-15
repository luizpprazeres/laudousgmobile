import { Button, Text, View } from "react-native";
import { router } from "expo-router";

export default function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        padding: 24,
        gap: 24,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text style={{ fontSize: 28, fontWeight: "600" }}>LaudoUSG</Text>
      <Text style={{ color: "#666" }}>Mobile-first, IA por trás.</Text>
      <Button
        title="Gerar laudo"
        onPress={() => router.push("/generate")}
      />
    </View>
  );
}
