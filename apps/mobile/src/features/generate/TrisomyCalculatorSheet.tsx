import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import {
  calcularTrissomias,
  formatarBlocoTrissomias,
  FmfTrisomyDomainError,
  parseDateBR,
  type Ethnicity,
  type FmfInput,
  type FmfResult,
} from "@laudousg/shared";
import { Sheet } from "@/ui/Sheet";
import { FONT, type ColorTokens } from "@/ui/tokens";
import { useColorTokens } from "@/ui/useColorTokens";
import { arredondarDoisAlgarismos, basalRatioT18T13, formatarRiscoExibicao, idadeNaDataExameAnos } from "./trisomyDisplay";

type Props = {
  open: boolean;
  onClose: () => void;
  onInsert: (bloco: string) => void;
  /** Falso enquanto não existe laudo gerado — o resultado pertence ao laudo, não aos achados. */
  canInsert: boolean;
};

const ETNIAS: { v: Ethnicity; label: string }[] = [
  { v: "white", label: "Branca" },
  { v: "black", label: "Negra" },
  { v: "south_asian", label: "Sul-asiática" },
  { v: "east_asian", label: "Leste-asiática" },
  { v: "mixed", label: "Mista" },
];

type NasalBone = "" | "presente" | "ausente";
const NASAL_OPCOES: { v: NasalBone; label: string }[] = [
  { v: "", label: "Não avaliado" },
  { v: "presente", label: "Presente" },
  { v: "ausente", label: "Ausente" },
];

type Tricuspid = "" | "normal" | "regurgitacao";
const TRICUSPID_OPCOES: { v: Tricuspid; label: string }[] = [
  { v: "", label: "Não avaliada" },
  { v: "normal", label: "Normal" },
  { v: "regurgitacao", label: "Regurgitação" },
];

/**
 * Rastreamento combinado de trissomias do 1º trimestre (T21, T18, T13) —
 * modelo da Fetal Medicine Foundation. Toda a matemática vem de
 * `@laudousg/shared`, o mesmo núcleo do iOS e da web; esta tela só coleta e
 * formata. Ver `packages/shared/src/calculators/fmfTrisomy.ts`.
 *
 * Idade: o motor exige a idade DECIMAL na data do EXAME — (exame −
 * nascimento)/365,25 — e converte internamente para a idade na DPP, como o
 * app oficial da FMF. Diferente da pré-eclâmpsia (que pede a idade na DPP),
 * aqui a data do exame é sempre hoje.
 *
 * Exibição do risco: teto "<1 em 10.000" e piso "1 em 2" do app da FMF, com
 * o denominador arredondado a 2 algarismos significativos — mesma lógica de
 * `apps/web/src/lib/calculators/trisomyFmf.ts`, replicada em
 * `./trisomyDisplay.ts`.
 */
export function TrisomyCalculatorSheet({ open, onClose, onInsert, canInsert }: Props) {
  const t = useColorTokens();
  const styles = useMemo(() => makeStyles(t), [t]);

  const [dataNascimento, setDataNascimento] = useState("");
  const [crl, setCrl] = useState("");
  const [nt, setNt] = useState("");
  const [fhr, setFhr] = useState("");
  const [igSem, setIgSem] = useState("");
  const [igDias, setIgDias] = useState("");

  const [etnia, setEtnia] = useState<Ethnicity>("white");
  const [peso, setPeso] = useState("");
  const [fumante, setFumante] = useState(false);
  const [prevT21, setPrevT21] = useState(false);
  const [prevT18, setPrevT18] = useState(false);
  const [prevT13, setPrevT13] = useState(false);

  const [nasalBone, setNasalBone] = useState<NasalBone>("");
  const [tricuspid, setTricuspid] = useState<Tricuspid>("");
  const [dvPI, setDvPI] = useState("");

  const [freeBetaHcgMoM, setFreeBetaHcgMoM] = useState("");
  const [pappaMoM, setPappaMoM] = useState("");
  const [momCorrigido, setMomCorrigido] = useState(false);

  const nascParsed = useMemo(() => parseDateBR(dataNascimento), [dataNascimento]);

  /** Idade decimal na data do exame (hoje) — o que o motor exige. */
  const idadeNoExame = useMemo(() => {
    if (!nascParsed) return null;
    return idadeNaDataExameAnos(nascParsed);
  }, [nascParsed]);

  const gaDaysDated = useMemo(() => {
    const s = int(igSem);
    const d = int(igDias) ?? 0;
    if (s == null) return null;
    return s * 7 + d;
  }, [igSem, igDias]);

  const { result, input, erro } = useMemo((): {
    result: FmfResult | null;
    input: FmfInput | null;
    erro: string | null;
  } => {
    const idade = idadeNoExame;
    const c = dec(crl);
    const n = dec(nt);
    if (idade == null || c == null || n == null) {
      return { result: null, input: null, erro: null };
    }
    const fbh = dec(freeBetaHcgMoM);
    const pap = dec(pappaMoM);
    const built: FmfInput = {
      maternalAge: idade,
      crl: c,
      nt: n,
      fhr: dec(fhr) ?? undefined,
      gaDaysDated: gaDaysDated ?? undefined,
      ethnicity: etnia,
      weight: dec(peso) ?? undefined,
      smoking: fumante,
      previousT21: prevT21,
      previousT18: prevT18,
      previousT13: prevT13,
      freeBetaHcgMoM: fbh ?? undefined,
      pappaMoM: pap ?? undefined,
      isMoMCorrected: momCorrigido && (fbh != null || pap != null) ? true : undefined,
      dvPI: dec(dvPI) ?? undefined,
      tricuspidRegurgitation: tricuspid === "" ? undefined : tricuspid === "regurgitacao",
      nasalBoneAbsent: nasalBone === "" ? undefined : nasalBone === "ausente",
    };
    try {
      return { result: calcularTrissomias(built), input: built, erro: null };
    } catch (e) {
      return {
        result: null,
        input: built,
        erro: e instanceof FmfTrisomyDomainError ? e.message : "não foi possível calcular",
      };
    }
  }, [
    idadeNoExame, crl, nt, fhr, gaDaysDated, etnia, peso, fumante,
    prevT21, prevT18, prevT13, freeBetaHcgMoM, pappaMoM, momCorrigido, dvPI, tricuspid, nasalBone,
  ]);

  const bloco = useMemo(() => {
    if (!result || !input) return null;
    return formatarBlocoTrissomias(input, result);
  }, [result, input]);

  return (
    <Sheet open={open} onClose={onClose} title="Trissomias (1º tri)" height={820}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.helper}>
          Rastreamento combinado de T21, T18 e T13 pelo modelo da Fetal
          Medicine Foundation, entre 11 e 13 semanas e 6 dias (CCN 45–84 mm).
          Feto único.
        </Text>

        <Secao styles={styles}>Dados maternos</Secao>
        <Campo
          label="Nascimento (DD/MM/AAAA)"
          value={dataNascimento}
          onChange={setDataNascimento}
          styles={styles}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
        />
        {idadeNoExame != null ? (
          <Text style={styles.derivado}>{n1(idadeNoExame)} anos na data do exame</Text>
        ) : null}
        <View style={styles.linha}>
          <Campo label="Peso (kg)" value={peso} onChange={setPeso} styles={styles} keyboardType="decimal-pad" />
        </View>

        <Text style={styles.rotulo}>Etnia</Text>
        <Chips opcoes={ETNIAS} valor={etnia} onSelect={setEtnia} styles={styles} />

        <Secao styles={styles}>Biometria</Secao>
        <View style={styles.linha}>
          <Campo label="CCN (mm)" value={crl} onChange={setCrl} styles={styles} keyboardType="decimal-pad" />
          <Campo label="TN (mm)" value={nt} onChange={setNt} styles={styles} keyboardType="decimal-pad" />
          <Campo label="FCF (bpm)" value={fhr} onChange={setFhr} styles={styles} keyboardType="number-pad" />
        </View>

        <Text style={styles.rotulo}>IG datada (opcional — se ausente, usa a do CCN)</Text>
        <View style={styles.linha}>
          <Campo label="semanas" value={igSem} onChange={setIgSem} styles={styles} keyboardType="number-pad" />
          <Campo label="dias" value={igDias} onChange={setIgDias} styles={styles} keyboardType="number-pad" />
        </View>
        {result ? (
          <Text style={styles.derivado}>
            IG usada no rastreio: {result.gaWeeks} semanas e {result.gaDaysRemainder} dias
          </Text>
        ) : null}

        <Secao styles={styles}>Marcadores adicionais</Secao>
        <Text style={styles.rotulo}>Osso nasal</Text>
        <Chips opcoes={NASAL_OPCOES} valor={nasalBone} onSelect={setNasalBone} styles={styles} />
        <Text style={[styles.rotulo, { marginTop: 8 }]}>Regurgitação tricúspide</Text>
        <Chips opcoes={TRICUSPID_OPCOES} valor={tricuspid} onSelect={setTricuspid} styles={styles} />
        {tricuspid === "regurgitacao" && dec(peso) == null ? (
          <Text style={styles.nota}>Informe o peso materno acima — exigido para este marcador.</Text>
        ) : null}
        <View style={[styles.linha, { marginTop: 8 }]}>
          <Campo label="IP ducto venoso" value={dvPI} onChange={setDvPI} styles={styles} keyboardType="decimal-pad" />
        </View>

        <Secao styles={styles}>Bioquímica (opcional)</Secao>
        <View style={styles.linha}>
          <Campo label="Free β-hCG (MoM)" value={freeBetaHcgMoM} onChange={setFreeBetaHcgMoM} styles={styles} keyboardType="decimal-pad" />
          <Campo label="PAPP-A (MoM)" value={pappaMoM} onChange={setPappaMoM} styles={styles} keyboardType="decimal-pad" />
        </View>
        <Toggle
          label="MoM já corrigido pelo laboratório"
          value={momCorrigido}
          onChange={setMomCorrigido}
          styles={styles}
        />

        <Secao styles={styles}>Antecedentes</Secao>
        <Toggle label="Tabagismo" value={fumante} onChange={setFumante} styles={styles} />
        <Toggle label="Trissomia 21 anterior" value={prevT21} onChange={setPrevT21} styles={styles} />
        <Toggle label="Trissomia 18 anterior" value={prevT18} onChange={setPrevT18} styles={styles} />
        <Toggle label="Trissomia 13 anterior" value={prevT13} onChange={setPrevT13} styles={styles} />

        {erro ? (
          <View style={styles.erroBox}>
            <Text style={styles.erroTexto}>{capitalizar(erro)}</Text>
          </View>
        ) : result ? (
          <View style={styles.resultBox}>
            <View style={styles.resultLinha}>
              <View style={styles.resultCelula}>
                <Text style={styles.resultRotulo}>T21</Text>
                <Text
                  style={[
                    styles.resultN,
                    result.t21.category === "alto" && { color: t.warningText },
                  ]}
                >
                  {formatarRiscoExibicao(result.t21, result)}
                </Text>
                <Text style={styles.resultBasal}>
                  basal: {formatarRiscoExibicao(result.basal.t21, result)}
                </Text>
              </View>
              <View style={styles.resultCelula}>
                <Text style={styles.resultRotulo}>Trissomias 13/18</Text>
                <Text
                  style={[
                    styles.resultN,
                    result.t18t13.category === "alto" && { color: t.warningText },
                  ]}
                >
                  {formatarRiscoExibicao(result.t18t13, result)}
                </Text>
                <Text style={styles.resultBasal}>
                  basal:{" "}
                  {formatarRiscoExibicao(
                    { probability: 0, ratio: basalRatioT18T13(result), category: "baixo" },
                    result,
                  )}
                </Text>
              </View>
            </View>
            <Text style={styles.resultDetalhe}>
              T18 isolada: {formatarRiscoExibicao(result.t18, result)} · T13 isolada:{" "}
              {formatarRiscoExibicao(result.t13, result)}
            </Text>
            <Text style={styles.resultDetalhe}>
              Marcadores utilizados: {result.markersUsed.join(", ")}.
            </Text>
            {result.warnings.length > 0
              ? result.warnings.map((w) => (
                  <Text key={w} style={styles.aviso}>
                    {w}
                  </Text>
                ))
              : null}
            <Pressable
              onPress={() => {
                if (!canInsert || !bloco) return;
                onInsert(bloco);
                onClose();
              }}
              disabled={!canInsert}
              style={({ pressed }) => [
                styles.insertBtn,
                !canInsert && { opacity: 0.5 },
                canInsert && pressed && { opacity: 0.7 },
              ]}
            >
              <Text style={styles.insertBtnText}>Inserir no laudo</Text>
            </Pressable>
            {!canInsert ? (
              <Text style={styles.insertHint}>
                Gere o laudo primeiro. O preenchimento fica guardado: volte aqui depois e toque em
                Inserir para levar o resultado à aba Laudo.
              </Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.hint}>
            Preencha a data de nascimento, o CCN e a TN para ver o risco.
            Bioquímica, ducto venoso, osso nasal e tricúspide refinam o
            resultado.
          </Text>
        )}
      </ScrollView>
    </Sheet>
  );
}

function Secao({ children, styles }: { children: string; styles: Estilos }) {
  return <Text style={styles.secao}>{children}</Text>;
}

function Campo({
  label, value, onChange, styles, keyboardType, maxLength,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  styles: Estilos;
  keyboardType?: "number-pad" | "decimal-pad" | "numbers-and-punctuation";
  maxLength?: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.rotulo}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        maxLength={maxLength}
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
            key={o.v || "none"}
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
/** Uma casa decimal, vírgula — "35,5". */
function n1(v: number): string {
  return v.toFixed(1).replace(".", ",");
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
      resultLinha: { flexDirection: "row", gap: 10 },
      resultCelula: { flex: 1 },
      resultRotulo: { fontFamily: FONT.body, fontSize: 12, color: t.textMute },
      resultN: { fontFamily: FONT.semibold, fontSize: 22, color: t.text, marginTop: 2 },
      resultBasal: { fontFamily: FONT.body, fontSize: 11, color: t.textMute, marginTop: 2 },
      resultDetalhe: { fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: t.textMute, marginTop: 10 },
      aviso: { fontFamily: FONT.medium, fontSize: 12, lineHeight: 18, color: t.warningText, marginTop: 6 },
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
      insertHint: { fontFamily: FONT.body, fontSize: 12, lineHeight: 17, color: t.textMute, marginTop: 8 },
      hint: { fontFamily: FONT.body, fontSize: 13, lineHeight: 19, color: t.textMute, marginTop: 24 },
    }),
    placeholderColor: t.textMute,
  };
}
