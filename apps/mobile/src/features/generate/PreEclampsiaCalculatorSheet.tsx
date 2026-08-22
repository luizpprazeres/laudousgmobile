import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import {
  calcularPreEclampsiaFmf,
  pamDeAfericoes,
  PeErroDeDominio,
  type PeEtnia,
  type PeParidade,
  type PeResultado,
} from "@laudousg/shared";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (bloco: string) => void;
};

/** IG a partir do CCN — fórmula da própria FMF. */
const gaDeCcn = (ccnMm: number) => 23.53 + 8.052 * Math.sqrt(1.037 * ccnMm);

const ETNIAS: { v: PeEtnia; label: string }[] = [
  { v: "branca", label: "Branca" },
  { v: "afro", label: "Negra" },
  { v: "sul-asiatica", label: "Sul-asiática" },
  { v: "leste-asiatica", label: "Leste-asiática" },
];

const PARIDADES: { v: PeParidade; label: string }[] = [
  { v: "nulipara", label: "Nulípara" },
  { v: "multipara-sem-pe", label: "Multípara" },
  { v: "multipara-com-pe", label: "Multíp. com PE" },
];

/**
 * Rastreio de pré-eclâmpsia do 1º trimestre — modelo de riscos competitivos da
 * Fetal Medicine Foundation. Toda a matemática vem de `@laudousg/shared`, que é
 * o mesmo núcleo do iOS e da web; esta tela só coleta e formata.
 *
 * A calculadora anterior somava pontos e devolvia categorias — era clinicamente
 * errada e foi removida. Ver `packages/fmf/README.md`.
 */
export function PreEclampsiaCalculatorSheet({ open, onClose, onInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  // ── dados maternos
  const [idade, setIdade] = useState("");
  const [peso, setPeso] = useState("");
  const [altura, setAltura] = useState("");
  const [etnia, setEtnia] = useState<PeEtnia>("branca");
  const [fumante, setFumante] = useState(false);

  // ── idade gestacional: por CCN (preferido) ou direto
  const [ccn, setCcn] = useState("");
  const [igSem, setIgSem] = useState("");
  const [igDias, setIgDias] = useState("");

  // ── história
  const [paridade, setParidade] = useState<PeParidade>("nulipara");
  const [igAnterior, setIgAnterior] = useState("");
  const [intervalo, setIntervalo] = useState("");
  const [zPeso, setZPeso] = useState("");
  const [histFamiliarPE, setHistFamiliarPE] = useState(false);
  const [hipertensaoCronica, setHipertensaoCronica] = useState(false);
  const [diabetes, setDiabetes] = useState(false);
  const [lesSaf, setLesSaf] = useState(false);
  const [fiv, setFiv] = useState(false);

  // ── pressão: 1 a 4 aferições. Na rotina costuma vir uma só.
  const [pa, setPa] = useState([
    { sis: "", dia: "" },
    { sis: "", dia: "" },
    { sis: "", dia: "" },
    { sis: "", dia: "" },
  ]);
  const [maisAfericoes, setMaisAfericoes] = useState(false);

  // ── uterinas
  const [ipDir, setIpDir] = useState("");
  const [ipEsq, setIpEsq] = useState("");

  const setPaAt = (i: number, campo: "sis" | "dia", v: string) =>
    setPa((prev) => prev.map((x, k) => (k === i ? { ...x, [campo]: v } : x)));

  const gaDias = useMemo(() => {
    const c = dec(ccn);
    if (c != null && c >= 45 && c <= 84) return Math.round(gaDeCcn(c));
    const s = int(igSem);
    const d = int(igDias) ?? 0;
    if (s != null) return s * 7 + d;
    return null;
  }, [ccn, igSem, igDias]);

  const pam = useMemo(() => {
    const afericoes = pa
      .map((x) => ({ sistolica: dec(x.sis), diastolica: dec(x.dia) }))
      .filter((x): x is { sistolica: number; diastolica: number } =>
        x.sistolica != null && x.diastolica != null
      );
    if (afericoes.length === 0) return null;
    try {
      return pamDeAfericoes(afericoes);
    } catch {
      return null;
    }
  }, [pa]);

  const ipMedio = useMemo(() => {
    const d = dec(ipDir);
    const e = dec(ipEsq);
    if (d != null && e != null) return (d + e) / 2;
    return d ?? e ?? null;
  }, [ipDir, ipEsq]);

  const { result, erro } = useMemo((): {
    result: PeResultado | null;
    erro: string | null;
  } => {
    const i = dec(idade);
    const p = dec(peso);
    const a = dec(altura);
    if (i == null || p == null || a == null || gaDias == null) {
      return { result: null, erro: null };
    }
    try {
      return {
        result: calcularPreEclampsiaFmf(
          {
            idade: i, peso: p, altura: a, gaDias, etnia, paridade,
            intervaloAnos: dec(intervalo),
            igPartoAnterior: dec(igAnterior),
            zEscorePesoAnterior: dec(zPeso),
            histFamiliarPE, fiv, hipertensaoCronica, diabetes, lesSaf, fumante,
          },
          {
            pamMmHg: pam?.pamMmHg ?? null,
            utaPiMedio: ipMedio,
            afericoesPam: pam?.afericoes ?? null,
          }
        ),
        erro: null,
      };
    } catch (e) {
      return {
        result: null,
        erro: e instanceof PeErroDeDominio ? e.message : "não foi possível calcular",
      };
    }
  }, [
    idade, peso, altura, gaDias, etnia, paridade, intervalo, igAnterior, zPeso,
    histFamiliarPE, fiv, hipertensaoCronica, diabetes, lesSaf, fumante, pam, ipMedio,
  ]);

  const momDe = (nome: "map" | "utaPi") =>
    result?.marcadores.find((m) => m.nome === nome)?.mom ?? null;

  return (
    <Sheet open={open} onClose={onClose} title="Pré-eclâmpsia (1º tri)" height={760}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Rastreio de 11 a 13 semanas e 6 dias pelo modelo de riscos competitivos
          da Fetal Medicine Foundation. Resultado em 1 em N, com o corte de 1:100
          para profilaxia com AAS.
        </Text>

        <Secao styles={styles}>Dados maternos</Secao>
        <View style={styles.linha}>
          <Campo label="Idade (anos)" value={idade} onChange={setIdade} styles={styles} keyboardType="number-pad" />
          <Campo label="Peso (kg)" value={peso} onChange={setPeso} styles={styles} keyboardType="decimal-pad" />
          <Campo label="Altura (cm)" value={altura} onChange={setAltura} styles={styles} keyboardType="decimal-pad" />
        </View>

        <Text style={styles.rotulo}>Etnia</Text>
        <Chips
          opcoes={ETNIAS}
          valor={etnia}
          onSelect={setEtnia}
          styles={styles}
        />

        <Secao styles={styles}>Idade gestacional</Secao>
        <View style={styles.linha}>
          <Campo label="CCN (mm)" value={ccn} onChange={setCcn} styles={styles} keyboardType="decimal-pad" />
          <Campo label="ou semanas" value={igSem} onChange={setIgSem} styles={styles} keyboardType="number-pad" />
          <Campo label="dias" value={igDias} onChange={setIgDias} styles={styles} keyboardType="number-pad" />
        </View>
        {gaDias != null ? (
          <Text style={styles.derivado}>
            {Math.floor(gaDias / 7)} semanas e {gaDias % 7} dias
            {dec(ccn) != null ? "  ·  pelo CCN" : ""}
          </Text>
        ) : null}

        <Secao styles={styles}>Pressão arterial</Secao>
        <Text style={styles.nota}>
          Uma aferição basta. O protocolo da FMF são quatro — se tiver, use o
          botão abaixo; o laudo declara quantas foram.
        </Text>
        <View style={styles.linha}>
          <Campo label="Sistólica" value={pa[0]!.sis} onChange={(v) => setPaAt(0, "sis", v)} styles={styles} keyboardType="number-pad" />
          <Campo label="Diastólica" value={pa[0]!.dia} onChange={(v) => setPaAt(0, "dia", v)} styles={styles} keyboardType="number-pad" />
        </View>
        {maisAfericoes ? (
          <>
            {[1, 2, 3].map((i) => (
              <View style={styles.linha} key={i}>
                <Campo label={`Sistólica ${i + 1}`} value={pa[i]!.sis} onChange={(v) => setPaAt(i, "sis", v)} styles={styles} keyboardType="number-pad" />
                <Campo label={`Diastólica ${i + 1}`} value={pa[i]!.dia} onChange={(v) => setPaAt(i, "dia", v)} styles={styles} keyboardType="number-pad" />
              </View>
            ))}
          </>
        ) : (
          <Pressable onPress={() => setMaisAfericoes(true)}>
            <Text style={styles.link}>+ tenho as 4 aferições do protocolo</Text>
          </Pressable>
        )}
        {pam ? (
          <Text style={styles.derivado}>
            PAM {pam.pamMmHg.toFixed(1).replace(".", ",")} mmHg
            {momDe("map") != null ? `  ·  ${momDe("map")!.toFixed(2).replace(".", ",")} MoM` : ""}
            {pam.protocoloCompleto ? "" : `  ·  ${pam.afericoes} aferição${pam.afericoes > 1 ? "ões" : ""}`}
          </Text>
        ) : null}

        <Secao styles={styles}>Artérias uterinas</Secao>
        <View style={styles.linha}>
          <Campo label="IP direita" value={ipDir} onChange={setIpDir} styles={styles} keyboardType="decimal-pad" />
          <Campo label="IP esquerda" value={ipEsq} onChange={setIpEsq} styles={styles} keyboardType="decimal-pad" />
        </View>
        {ipMedio != null ? (
          <Text style={styles.derivado}>
            IP médio {ipMedio.toFixed(2).replace(".", ",")}
            {momDe("utaPi") != null ? `  ·  ${momDe("utaPi")!.toFixed(2).replace(".", ",")} MoM` : ""}
          </Text>
        ) : null}

        <Secao styles={styles}>História obstétrica</Secao>
        <Chips opcoes={PARIDADES} valor={paridade} onSelect={setParidade} styles={styles} />
        {paridade !== "nulipara" ? (
          <View style={styles.linha}>
            <Campo label="Parto ant. (sem)" value={igAnterior} onChange={setIgAnterior} styles={styles} keyboardType="decimal-pad" />
            <Campo label="Intervalo (anos)" value={intervalo} onChange={setIntervalo} styles={styles} keyboardType="decimal-pad" />
            {paridade === "multipara-com-pe" ? (
              <Campo label="Z-score peso" value={zPeso} onChange={setZPeso} styles={styles} keyboardType="numbers-and-punctuation" />
            ) : null}
          </View>
        ) : null}

        <Secao styles={styles}>Antecedentes</Secao>
        <Toggle label="Hipertensão crônica" value={hipertensaoCronica} onChange={setHipertensaoCronica} styles={styles} />
        <Toggle label="Diabetes (tipo 1 ou 2)" value={diabetes} onChange={setDiabetes} styles={styles} />
        <Toggle label="LES ou SAF" value={lesSaf} onChange={setLesSaf} styles={styles} />
        <Toggle label="Mãe teve pré-eclâmpsia" value={histFamiliarPE} onChange={setHistFamiliarPE} styles={styles} />
        <Toggle label="Concepção por FIV" value={fiv} onChange={setFiv} styles={styles} />
        <Toggle label="Tabagismo" value={fumante} onChange={setFumante} styles={styles} />

        {erro ? (
          <View style={styles.erroBox}>
            <Text style={styles.erroTexto}>{capitalizar(erro)}</Text>
          </View>
        ) : result ? (
          <View style={[styles.resultBox, result.altoRisco && styles.resultBoxAlto]}>
            <Text style={styles.resultRotulo}>Risco antes de 37 semanas</Text>
            <Text style={[styles.resultN, result.altoRisco && { color: t.warningText }]}>
              1 em {result.umEmN.toLocaleString("pt-BR")}
            </Text>
            <Text style={styles.resultConduta}>
              {result.altoRisco
                ? "Risco aumentado (corte 1:100). Considerar AAS 150 mg à noite até 36 semanas."
                : "Risco não aumentado (corte 1:100). Pré-natal de rotina."}
            </Text>
            <Pressable
              onPress={() => {
                onInsert(result.insertBloco);
                onClose();
              }}
              style={({ pressed }) => [styles.insertBtn, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.insertBtnText}>Inserir no laudo</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={styles.hint}>
            Preencha idade, peso, altura e a idade gestacional para ver o risco.
            A pressão e o Doppler das uterinas refinam o resultado.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function Secao({ children, styles }: { children: string; styles: Estilos }) {
  return <Text style={styles.secao}>{children}</Text>;
}

function Campo({
  label, value, onChange, styles, keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  styles: Estilos;
  keyboardType?: "number-pad" | "decimal-pad" | "numbers-and-punctuation";
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.rotulo}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        style={styles.input}
        placeholderTextColor={styles.placeholderColor}
      />
    </View>
  );
}

function Chips<T extends string>({
  opcoes, valor, onSelect, styles,
}: {
  opcoes: { v: T; label: string }[];
  valor: T;
  onSelect: (v: T) => void;
  styles: Estilos;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
      {opcoes.map((o) => {
        const ativo = o.v === valor;
        return (
          <Pressable
            key={o.v}
            onPress={() => onSelect(o.v)}
            style={[styles.chip, ativo && styles.chipAtivo]}
          >
            <Text style={[styles.chipTexto, ativo && styles.chipTextoAtivo]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function Toggle({
  label, value, onChange, styles,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  styles: Estilos;
}) {
  return (
    <View style={styles.toggleLinha}>
      <Text style={styles.toggleTexto}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function dec(s: string): number | null {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
}
function int(s: string): number | null {
  const v = parseInt(s, 10);
  return Number.isFinite(v) ? v : null;
}
const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

type Estilos = ReturnType<typeof makeStyles>;

function makeStyles(t: ColorTokens) {
  return {
    ...StyleSheet.create({
      helper: { fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: t.textMute, marginTop: 12 },
      nota: { fontFamily: FONT.body, fontSize: 12, lineHeight: 17, color: t.textMute, marginBottom: 8 },
      secao: { fontFamily: FONT.semibold, fontSize: 13, color: t.text, marginTop: 22, marginBottom: 10 },
      rotulo: { fontFamily: FONT.body, fontSize: 11, color: t.textMute, marginBottom: 4 },
      linha: { flexDirection: "row", gap: 10, marginBottom: 6 },
      input: {
        fontFamily: FONT.body, fontSize: 15, color: t.text,
        borderWidth: 1, borderColor: t.separator, borderRadius: 10,
        paddingHorizontal: 10, paddingVertical: 9, backgroundColor: t.card,
      },
      derivado: { fontFamily: FONT.medium, fontSize: 13, color: t.brandDeep, marginTop: 4, marginBottom: 4 },
      link: { fontFamily: FONT.medium, fontSize: 13, color: t.brandDeep, marginTop: 4, marginBottom: 4 },
      chip: {
        paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999,
        borderWidth: 1, borderColor: t.separator, backgroundColor: t.card,
      },
      chipAtivo: { backgroundColor: t.brandDeep, borderColor: t.brandDeep },
      chipTexto: { fontFamily: FONT.medium, fontSize: 13, color: t.text },
      chipTextoAtivo: { color: t.bg },
      toggleLinha: {
        flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        paddingVertical: 7,
      },
      toggleTexto: { fontFamily: FONT.body, fontSize: 14, color: t.text, flex: 1, paddingRight: 12 },
      resultBox: {
        marginTop: 24, padding: 16, borderRadius: 14,
        backgroundColor: t.card, borderWidth: 1, borderColor: t.separator,
      },
      resultBoxAlto: { borderColor: t.warningText },
      resultRotulo: { fontFamily: FONT.body, fontSize: 12, color: t.textMute },
      resultN: { fontFamily: FONT.semibold, fontSize: 28, color: t.text, marginTop: 2 },
      resultConduta: { fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: t.textMute, marginTop: 8 },
      erroBox: {
        marginTop: 24, padding: 14, borderRadius: 12,
        borderWidth: 1, borderColor: t.warningText, backgroundColor: t.card,
      },
      erroTexto: { fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: t.warningText },
      insertBtn: {
        marginTop: 14, backgroundColor: t.brandDeep, borderRadius: 10,
        paddingVertical: 12, alignItems: "center",
      },
      insertBtnText: { fontFamily: FONT.semibold, fontSize: 15, color: t.bg },
      hint: { fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: t.textMute, marginTop: 24 },
    }),
    placeholderColor: t.textMute,
  };
}
