import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { Sheet } from "@/ui/Sheet";
import { PrimaryButton, SecondaryButton } from "@/ui/Button";
import { useColorTokens } from "@/ui/useColorTokens";
import {
  CATEGORIAS_COM_MODELO,
  descartarRascunho,
  desligar,
  getPersonalizacao,
  PersonalizacaoRecusada,
  publicar,
  salvarRascunho,
  type EstadoPersonalizacao,
  type Operacao,
  type SlotDescricao,
} from "@/lib/personalizacao";

/**
 * O modelo de laudo do médico, como TEXTO CORRIDO — e as alterações mostradas
 * no ponto exato: a frase antiga riscada, a nova logo abaixo.
 *
 * O que está em jogo aqui é confiança. O médico precisa (a) reconhecer o
 * próprio laudo ao olhar a tela, (b) ver exatamente o que vai mudar antes de
 * valer, e (c) entender a recusa quando o sistema disser não. Por isso não há
 * formulário de campos: há o laudo, e frases que se tocam.
 *
 * Nada aqui muda laudo nenhum até "Passar a usar". Antes disso é rascunho.
 */

type Props = { categoria?: string };

/** `{ig_semanas}` vira um pedaço destacado: é dado do exame, não texto fixo. */
function FraseComDados({ frase, cor, corDado }: { frase: string; cor: string; corDado: string }) {
  const partes = frase.split(/(\{\w+\})/g).filter((p) => p !== "");
  return (
    <Text style={{ color: cor, fontSize: 15, lineHeight: 23 }}>
      {partes.map((p, i) =>
        /^\{\w+\}$/.test(p) ? (
          <Text key={i} style={{ color: corDado, fontWeight: "600" }}>
            {p.slice(1, -1).replace(/_/g, " ")}
          </Text>
        ) : (
          <Text key={i}>{p}</Text>
        ),
      )}
    </Text>
  );
}

export function ModeloEditor({ categoria = "OBSTETRICA" }: Props) {
  const t = useColorTokens();
  const [estado, setEstado] = useState<EstadoPersonalizacao | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [recusa, setRecusa] = useState<string[] | null>(null);
  const [ops, setOps] = useState<Operacao[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [slotAberto, setSlotAberto] = useState<SlotDescricao | null>(null);
  const [rascunhoTexto, setRascunhoTexto] = useState("");
  const [modoEdicao, setModoEdicao] = useState<"trocar" | "depois" | "conclusao" | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const e = await getPersonalizacao(categoria);
      setEstado(e);
      // O rascunho do servidor é a verdade — não o que ficou nesta tela.
      setOps((e.rascunho?.operations ?? []) as Operacao[]);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "não foi possível carregar");
    } finally {
      setCarregando(false);
    }
  }, [categoria]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  /** Slots na ordem em que aparecem no laudo, com a variante padrão. */
  const linhas = useMemo(() => {
    if (!estado) return [];
    const porId = new Map(estado.catalogo.slots.map((s) => [s.id, s]));
    const ordem = estado.catalogo.ordens[0]?.slots ?? [];
    const vistos = new Set<string>();
    return ordem.flatMap((id) => {
      if (vistos.has(id)) return []; // gemelar repete o slot; mostra uma vez
      vistos.add(id);
      const slot = porId.get(id);
      if (!slot) return [];
      const padrao = slot.variantes.find((v) => v.padrao) ?? slot.variantes[0];
      if (!padrao?.frase) return [];
      return [{ slot, frase: padrao.frase, varianteId: padrao.id, editavel: padrao.editavel, motivo: padrao.motivo }];
    });
  }, [estado]);

  const opDoSlot = (slotId: string) => ops.find((o) => "slot" in o && o.slot === slotId);
  const removidos = useMemo(
    () => new Set(ops.filter((o) => o.op === "remove_slot").map((o) => o.slot)),
    [ops],
  );
  const itensConclusao = ops.filter((o) => o.op === "append_conclusion_item");
  /**
   * Frases acrescentadas depois de um slot. Precisam ser desenhadas junto da
   * âncora: elas nascem como `custom:<n>` no backend e não existem no catálogo
   * base, então sem isto o médico acrescentaria uma frase e não a veria — a
   * função pareceria quebrada.
   */
  const inseridasApos = useMemo(() => {
    const m = new Map<string, { texto: string; indice: number }[]>();
    ops.forEach((o, i) => {
      if (o.op !== "insert_phrase_after") return;
      const lista = m.get(o.anchor) ?? [];
      lista.push({ texto: o.value, indice: i });
      m.set(o.anchor, lista);
    });
    return m;
  }, [ops]);

  async function aplicar(novas: Operacao[]) {
    setSalvando(true);
    setRecusa(null);
    setErro(null);
    try {
      if (novas.length === 0) {
        await descartarRascunho(categoria);
        setOps([]);
      } else {
        const r = await salvarRascunho(categoria, novas);
        setOps(r.rascunho.operations as Operacao[]);
      }
      await carregar();
    } catch (err) {
      if (err instanceof PersonalizacaoRecusada) {
        // A recusa é informação, não falha: o backend explica por que aquela
        // alteração não pode valer. O rascunho local volta ao que era.
        setRecusa(err.erros.length > 0 ? err.erros : [err.message]);
        setOps((estado?.rascunho?.operations ?? []) as Operacao[]);
      } else {
        setErro(err instanceof Error ? err.message : "não foi possível salvar");
      }
    } finally {
      setSalvando(false);
    }
  }

  function abrirSlot(slot: SlotDescricao, frase: string, editavel: boolean) {
    if (!editavel) {
      setSlotAberto(slot);
      setModoEdicao(null);
      return;
    }
    const atual = opDoSlot(slot.id);
    setRascunhoTexto(atual?.op === "replace_phrase" ? atual.value : frase);
    setSlotAberto(slot);
    setModoEdicao(null);
  }

  function fechar() {
    setSlotAberto(null);
    setModoEdicao(null);
    setRascunhoTexto("");
  }

  const publicado = estado?.publicado ?? null;
  const temRascunho = ops.length > 0;

  if (carregando && !estado) {
    return (
      <View style={{ padding: 32, alignItems: "center" }}>
        <ActivityIndicator color={t.brand} />
      </View>
    );
  }

  if (erro && !estado) {
    return (
      <View style={{ padding: 20 }}>
        <Text style={{ color: t.danger, fontSize: 15 }}>{erro}</Text>
        <View style={{ height: 12 }} />
        <PrimaryButton title="Tentar de novo" onPress={() => void carregar()} />
      </View>
    );
  }
  if (!estado) return null;

  return (
    <>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 140 }}>
        {/* estado atual */}
        {publicado ? (
          <View
            style={{
              backgroundColor: t.brandLight,
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <Text style={{ color: t.brand, fontWeight: "700", fontSize: 13 }}>
              Em uso nos seus laudos
            </Text>
            <Text style={{ color: t.textSec, fontSize: 13, marginTop: 2 }}>
              Versão {publicado.versao} · {publicado.operations.length} alteração(ões)
            </Text>
          </View>
        ) : (
          <Text style={{ color: t.textSec, fontSize: 13, marginBottom: 14, lineHeight: 19 }}>
            Este é o modelo padrão do laudo obstétrico. Toque em qualquer frase para
            mudar a redação, tirá-la do laudo, ou acrescentar outra depois dela.
          </Text>
        )}

        {recusa && (
          <View
            style={{
              borderWidth: 1,
              borderColor: t.danger,
              borderRadius: 12,
              padding: 12,
              marginBottom: 14,
            }}
          >
            <Text style={{ color: t.danger, fontWeight: "700", fontSize: 13, marginBottom: 4 }}>
              Esta alteração não pode valer
            </Text>
            {recusa.map((m, i) => (
              <Text key={i} style={{ color: t.text, fontSize: 13, lineHeight: 19 }}>
                • {m}
              </Text>
            ))}
          </View>
        )}

        {/* o modelo, como texto corrido */}
        <Text style={{ color: t.textSec, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>
          {estado.catalogo.cabecalhos.corpo}
        </Text>

        {linhas.map(({ slot, frase, editavel, motivo }) => {
          const op = opDoSlot(slot.id);
          const removido = removidos.has(slot.id);
          const trocado = op?.op === "replace_phrase" ? op.value : null;
          return (
            <Pressable
              key={slot.id}
              onPress={() => abrirSlot(slot, frase, editavel)}
              style={({ pressed }) => ({
                paddingVertical: 7,
                paddingHorizontal: 8,
                marginHorizontal: -8,
                borderRadius: 8,
                backgroundColor: pressed ? t.fill2 : "transparent",
              })}
            >
              {/* a frase original: riscada quando mudou ou saiu */}
              <Text
                style={{
                  color: removido || trocado ? t.textSec : t.text,
                  fontSize: 15,
                  lineHeight: 23,
                  textDecorationLine: removido || trocado ? "line-through" : "none",
                }}
              >
                {removido || trocado ? (
                  frase.replace(/\{(\w+)\}/g, (_, v: string) => v.replace(/_/g, " "))
                ) : (
                  <FraseComDados frase={frase} cor={t.text} corDado={t.brand} />
                )}
              </Text>

              {/* a substituta, logo abaixo */}
              {trocado && (
                <View style={{ marginTop: 3 }}>
                  <FraseComDados frase={trocado} cor={t.brand} corDado={t.brand} />
                </View>
              )}
              {removido && (
                <Text style={{ color: t.textSec, fontSize: 12, marginTop: 2, fontStyle: "italic" }}>
                  não aparece mais no laudo
                </Text>
              )}
              {!editavel && !removido && !trocado && (
                <Text style={{ color: t.textSec, fontSize: 11, marginTop: 2 }}>
                  escrita pelo sistema
                </Text>
              )}

              {/* frases que o médico acrescentou depois desta */}
              {(inseridasApos.get(slot.id) ?? []).map((ins) => (
                <Pressable
                  key={ins.indice}
                  onPress={() => void aplicar(ops.filter((_, i) => i !== ins.indice))}
                  style={{ marginTop: 4, flexDirection: "row", alignItems: "flex-start", gap: 6 }}
                >
                  <Text style={{ color: t.brand, fontSize: 15, lineHeight: 23 }}>+</Text>
                  <View style={{ flex: 1 }}>
                    <FraseComDados frase={ins.texto} cor={t.brand} corDado={t.brandDeep} />
                    <Text style={{ color: t.textGhost, fontSize: 11 }}>toque para desfazer</Text>
                  </View>
                </Pressable>
              ))}
            </Pressable>
          );
        })}

        {/* conclusão: itens acrescentados */}
        {itensConclusao.length > 0 && (
          <View style={{ marginTop: 18 }}>
            <Text style={{ color: t.textSec, fontSize: 11, letterSpacing: 1, marginBottom: 8 }}>
              {estado.catalogo.cabecalhos.conclusao}
            </Text>
            {itensConclusao.map((o) => {
              const indice = ops.indexOf(o);
              return (
                <Pressable
                  key={indice}
                  onPress={() => void aplicar(ops.filter((_, i) => i !== indice))}
                  style={{ marginBottom: 5 }}
                >
                  <Text style={{ color: t.brand, fontSize: 15, lineHeight: 23 }}>
                    + {"value" in o ? o.value : ""}
                  </Text>
                  <Text style={{ color: t.textGhost, fontSize: 11 }}>toque para desfazer</Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={{ height: 16 }} />
        <SecondaryButton title="Acrescentar item à conclusão"
          onPress={() => {
            setSlotAberto(null);
            setRascunhoTexto("");
            setModoEdicao("conclusao");
          }}
        />
      </ScrollView>

      {/* rodapé de ações */}
      {(temRascunho || publicado) && (
        <View
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            padding: 14,
            paddingBottom: 26,
            backgroundColor: t.bg,
            borderTopWidth: 1,
            borderTopColor: t.separator,
            gap: 8,
          }}
        >
          {temRascunho && (
            <>
              <Text style={{ color: t.textSec, fontSize: 12, textAlign: "center" }}>
                {ops.length} alteração(ões) ainda não valem nos seus laudos
              </Text>
              <PrimaryButton title={salvando ? "Publicando…" : "Passar a usar nos meus laudos"}
                disabled={salvando}
                onPress={async () => {
                  setSalvando(true);
                  setRecusa(null);
                  try {
                    await publicar(categoria);
                    await carregar();
                  } catch (err) {
                    if (err instanceof PersonalizacaoRecusada) setRecusa(err.erros);
                    else setErro(err instanceof Error ? err.message : "não foi possível publicar");
                  } finally {
                    setSalvando(false);
                  }
                }}
              />
              {/* SecondaryButton não tem `disabled`: a guarda fica no handler. */}
              <SecondaryButton
                title="Descartar alterações"
                onPress={() => {
                  if (salvando) return;
                  void aplicar([]);
                }}
              />
            </>
          )}
          {!temRascunho && publicado && (
            <SecondaryButton
              title="Voltar ao modelo padrão"
              onPress={async () => {
                if (salvando) return;
                setSalvando(true);
                try {
                  await desligar(categoria);
                  await carregar();
                } finally {
                  setSalvando(false);
                }
              }}
            />
          )}
        </View>
      )}

      {/* ações de uma frase */}
      <Sheet open={slotAberto !== null || modoEdicao === "conclusao"} onClose={fechar} height={420}>
        {modoEdicao === null && slotAberto && (
          <View style={{ gap: 10 }}>
            {(() => {
              const linha = linhas.find((l) => l.slot.id === slotAberto.id);
              if (linha && !linha.editavel) {
                return (
                  <>
                    <Text style={{ color: t.text, fontWeight: "700", fontSize: 15 }}>
                      Esta frase não pode ser mudada
                    </Text>
                    <Text style={{ color: t.textSec, fontSize: 14, lineHeight: 21 }}>
                      {linha.motivo}
                    </Text>
                  </>
                );
              }
              return (
                <>
                  <PrimaryButton title="Trocar a redação" onPress={() => setModoEdicao("trocar")} />
                  <SecondaryButton title="Acrescentar frase depois desta"
                    onPress={() => {
                      setRascunhoTexto("");
                      setModoEdicao("depois");
                    }}
                  />
                  {opDoSlot(slotAberto.id) ? (
                    <SecondaryButton title="Desfazer esta alteração"
                      onPress={() => {
                        void aplicar(ops.filter((o) => !("slot" in o && o.slot === slotAberto.id)));
                        fechar();
                      }}
                    />
                  ) : slotAberto.obrigatorio ? (
                    <Text style={{ color: t.textSec, fontSize: 13, textAlign: "center" }}>
                      Esta frase é obrigatória e não pode sair do laudo.
                    </Text>
                  ) : (
                    <SecondaryButton title="Tirar do laudo"
                      onPress={() => {
                        void aplicar([
                          ...ops.filter((o) => !("slot" in o && o.slot === slotAberto.id)),
                          { op: "remove_slot", slot: slotAberto.id },
                        ]);
                        fechar();
                      }}
                    />
                  )}
                </>
              );
            })()}
          </View>
        )}

        {modoEdicao !== null && (
          <View style={{ gap: 10 }}>
            <Text style={{ color: t.text, fontWeight: "700", fontSize: 15 }}>
              {modoEdicao === "trocar"
                ? "Como você prefere escrever"
                : modoEdicao === "depois"
                  ? "Frase a acrescentar depois"
                  : "Item a acrescentar na conclusão"}
            </Text>
            {modoEdicao === "trocar" && slotAberto && slotAberto.placeholdersObrigatorios.length > 0 && (
              <Text style={{ color: t.textSec, fontSize: 12, lineHeight: 18 }}>
                Conserve {slotAberto.placeholdersObrigatorios.map((p) => `{${p}}`).join(", ")} — é o
                dado medido no exame.
              </Text>
            )}
            <TextInput
              value={rascunhoTexto}
              onChangeText={setRascunhoTexto}
              multiline
              autoFocus
              style={{
                borderWidth: 1,
                borderColor: t.separator,
                borderRadius: 10,
                padding: 12,
                minHeight: 92,
                color: t.text,
                fontSize: 15,
                lineHeight: 22,
                textAlignVertical: "top",
              }}
            />
            <PrimaryButton title="Guardar"
              disabled={rascunhoTexto.trim() === "" || salvando}
              onPress={() => {
                const v = rascunhoTexto.trim();
                const semAnterior = slotAberto
                  ? ops.filter((o) => !("slot" in o && o.slot === slotAberto.id))
                  : ops;
                const nova: Operacao =
                  modoEdicao === "conclusao"
                    ? { op: "append_conclusion_item", value: v }
                    : modoEdicao === "depois"
                      ? { op: "insert_phrase_after", anchor: slotAberto!.id, value: v }
                      : { op: "replace_phrase", slot: slotAberto!.id, value: v };
                void aplicar(
                  modoEdicao === "trocar" ? [...semAnterior, nova] : [...ops, nova],
                );
                fechar();
              }}
            />
          </View>
        )}
      </Sheet>
    </>
  );
}

export { CATEGORIAS_COM_MODELO };
