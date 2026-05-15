import { useReducer, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Button,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import {
  generateReducer,
  initialGenerateState,
} from "@/features/generate/state";
import { generateReportStream, type MockScenario } from "@/lib/api";

// TODO: ler default_writing_style_id do profile
const DEFAULT_WRITING_STYLE_ID = "11111111-1111-4111-8111-111111111111"; // CLASSICO_COMPLETO

const MOCK_SCENARIOS: MockScenario[] = [
  "happy",
  "clarify",
  "blocked",
  "error",
  "slow",
];

export default function GenerateScreen() {
  const [state, dispatch] = useReducer(generateReducer, initialGenerateState);
  const [mock, setMock] = useState<MockScenario | null>(__DEV__ ? "happy" : null);
  const aborterRef = useRef<AbortController | null>(null);

  async function startGenerate() {
    dispatch({ type: "GENERATE" });
    const ac = new AbortController();
    aborterRef.current = ac;
    try {
      for await (const ev of generateReportStream(
        {
          raw_input: state.text || "(input em branco — modo mock)",
          writing_style_id: DEFAULT_WRITING_STYLE_ID,
        },
        ac.signal,
        mock ?? undefined,
      )) {
        dispatch({ type: "SSE_EVENT", event: ev });
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      dispatch({
        type: "FAIL",
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  function cancel() {
    aborterRef.current?.abort();
    dispatch({ type: "RESET" });
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 80 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* DEV: Mock toggle */}
      {__DEV__ ? (
        <View
          style={{
            borderWidth: 1,
            borderColor: "#fa0",
            borderRadius: 8,
            padding: 8,
            gap: 6,
          }}
        >
          <Text style={{ fontWeight: "600", color: "#a60" }}>
            DEV: cenário mock
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            <Button
              title={mock === null ? "● real" : "○ real"}
              onPress={() => setMock(null)}
            />
            {MOCK_SCENARIOS.map((s) => (
              <Button
                key={s}
                title={`${mock === s ? "● " : "○ "}${s}`}
                onPress={() => setMock(s)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {/* INPUT */}
      <View style={{ gap: 8 }}>
        <Text style={{ fontWeight: "600" }}>Achados (dite ou digite)</Text>
        <TextInput
          multiline
          placeholder="Ex: útero em anteversão, medindo 6,3 x 3,1 x 4,0 cm, volume 43,2 cm³…"
          value={state.text}
          onChangeText={(t) =>
            dispatch({ type: "EDIT_TEXT", text: t })
          }
          editable={
            state.kind === "idle" ||
            state.kind === "ready" ||
            state.kind === "error"
          }
          style={{
            minHeight: 160,
            borderWidth: 1,
            borderColor: "#ccc",
            borderRadius: 8,
            padding: 12,
            textAlignVertical: "top",
          }}
        />
      </View>

      {/* CHIPS — categoria detectada (depois do structured) */}
      {state.kind === "generating" && state.structured ? (
        <Text style={{ color: "#0a7" }}>
          ● {state.structured.categoria_detectada} —{" "}
          {state.structured.tipo_exame}
        </Text>
      ) : null}

      {/* AÇÕES */}
      {state.kind === "idle" || state.kind === "ready" ? (
        <View style={{ flexDirection: "row", gap: 12 }}>
          <Button
            title="🎤 Gravar áudio (em breve)"
            onPress={() =>
              Alert.alert("Áudio", "Integração Deepgram na próxima sessão.")
            }
          />
          <Button
            title="Gerar laudo"
            onPress={startGenerate}
            disabled={state.kind !== "ready"}
          />
        </View>
      ) : null}

      {/* GERANDO */}
      {state.kind === "generating" ? (
        <View style={{ gap: 12 }}>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
            <ActivityIndicator />
            <Text>Gerando…</Text>
            <Button title="Cancelar" onPress={cancel} />
          </View>
          {state.streamedText ? (
            <View
              style={{
                borderWidth: 1,
                borderColor: "#eee",
                padding: 12,
                borderRadius: 8,
              }}
            >
              <Text>{state.streamedText}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* CLARIFY */}
      {state.kind === "clarifying" ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: "600" }}>
            Antes de gerar, preciso confirmar:
          </Text>
          {state.questions.map((q) => (
            <View key={q.id} style={{ gap: 4 }}>
              <Text>{q.question}</Text>
              <TextInput
                value={state.answers[q.id] ?? ""}
                onChangeText={(t) =>
                  dispatch({
                    type: "ANSWER_CLARIFY",
                    questionId: q.id,
                    answer: t,
                  })
                }
                style={{
                  borderWidth: 1,
                  borderColor: "#ccc",
                  borderRadius: 8,
                  padding: 8,
                }}
              />
            </View>
          ))}
          <Button
            title="Continuar"
            onPress={() => {
              // TODO: chamar generate com clarify_answers + resume_from_report_id
              Alert.alert("Resume", "TODO: integrar resume com clarify_answers");
            }}
          />
        </View>
      ) : null}

      {/* DONE */}
      {state.kind === "done" ? (
        <View style={{ gap: 12 }}>
          <Text style={{ fontWeight: "600", color: "#0a7" }}>Laudo pronto</Text>
          <View
            style={{
              borderWidth: 1,
              borderColor: "#0a7",
              padding: 12,
              borderRadius: 8,
            }}
          >
            <Text>{state.finalText}</Text>
          </View>
          <Button
            title="Abrir detalhes"
            onPress={() => router.push(`/report/${state.reportId}`)}
          />
          <Button title="Novo laudo" onPress={() => dispatch({ type: "RESET" })} />
        </View>
      ) : null}

      {/* BLOCKED */}
      {state.kind === "blocked" ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontWeight: "600", color: "#c00" }}>
            Geração bloqueada pelo sanity check
          </Text>
          <Text>{state.reason}</Text>
          {state.sanity.issues.map((i, idx) => (
            <Text key={idx}>
              [{i.severity}] {i.type}: {i.detail}
            </Text>
          ))}
          <Button title="Voltar e revisar" onPress={() => dispatch({ type: "RESET" })} />
        </View>
      ) : null}

      {/* ERROR */}
      {state.kind === "error" ? (
        <View style={{ gap: 8 }}>
          <Text style={{ color: "#c00" }}>Erro: {state.message}</Text>
          <Button title="Recomeçar" onPress={() => dispatch({ type: "RESET" })} />
        </View>
      ) : null}
    </ScrollView>
  );
}
