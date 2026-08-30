import { useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import { Sheet } from '@/ui/Sheet'
import { FONT, type ColorTokens } from '@/ui/tokens'
import { useColorTokens } from '@/ui/useColorTokens'
import { connectCompanion, restoreCompanionConnection, sendCompanionText, type CompanionConnection } from './companion'

type Props = { open: boolean; onClose: () => void }

export function CompanionSheet({ open, onClose }: Props) {
  const t = useColorTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [connection, setConnection] = useState<CompanionConnection | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!open || connection) return
    restoreCompanionConnection().then(setConnection).catch(() => undefined)
  }, [connection, open])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Conectar à web" height={560}>
      <View style={styles.container}>
        {connection ? (
          <>
            <View style={styles.okCard}>
              <Text style={styles.okTitle}>Celular conectado</Text>
              <Text style={styles.body}>O texto será mostrado à auxiliar como entrada pendente. Ela decide quando aplicar ao laudo.</Text>
            </View>
            <TextInput
              value={message}
              onChangeText={(value) => { setMessage(value); setSent(false) }}
              placeholder="Ex.: acrescentar que o paciente tem dor no hipocôndrio direito"
              placeholderTextColor={t.textGhost}
              multiline
              maxLength={2000}
              style={styles.messageInput}
            />
            <Pressable
              disabled={busy || !message.trim()}
              onPress={() => run(async () => {
                await sendCompanionText(connection, message)
                setMessage('')
                setSent(true)
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
              })}
              style={({ pressed }) => [styles.primary, (pressed || busy || !message.trim()) && { opacity: 0.55 }]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Enviar para a web</Text>}
            </Pressable>
            {sent ? <Text style={styles.success}>Mensagem enviada.</Text> : null}
          </>
        ) : (
          <>
            <Text style={styles.title}>Digite o código mostrado no computador</Text>
            <Text style={styles.body}>Abra Celular no LaudoUSG Web. O código vale por 10 minutos e só funciona nesta mesma conta.</Text>
            <TextInput
              value={code}
              onChangeText={(value) => setCode(value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={7}
              placeholder="ABC 234"
              placeholderTextColor={t.textGhost}
              style={styles.codeInput}
            />
            <Pressable
              disabled={busy}
              onPress={() => run(async () => setConnection(await connectCompanion(code)))}
              style={({ pressed }) => [styles.primary, (pressed || busy) && { opacity: 0.6 }]}
            >
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Conectar</Text>}
            </Pressable>
          </>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>
    </Sheet>
  )
}

function makeStyles(t: ColorTokens) {
  return StyleSheet.create({
    container: { paddingHorizontal: 22, paddingTop: 8, gap: 14 },
    title: { fontFamily: FONT.bold, fontSize: 18, color: t.text },
    body: { fontFamily: FONT.body, fontSize: 14, lineHeight: 20, color: t.text2 },
    codeInput: { height: 64, borderRadius: 18, borderWidth: 1, borderColor: t.separator, color: t.text, fontFamily: FONT.bold, fontSize: 28, letterSpacing: 5, textAlign: 'center', backgroundColor: t.card },
    messageInput: { minHeight: 130, borderRadius: 18, borderWidth: 1, borderColor: t.separator, color: t.text, fontFamily: FONT.body, fontSize: 15, padding: 16, textAlignVertical: 'top', backgroundColor: t.card },
    primary: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.brand },
    primaryText: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
    okCard: { borderRadius: 16, padding: 16, gap: 6, backgroundColor: t.brandLight },
    okTitle: { color: t.brand, fontFamily: FONT.bold, fontSize: 16 },
    success: { color: t.brand, textAlign: 'center', fontFamily: FONT.bold, fontSize: 13 },
    error: { color: t.danger, fontFamily: FONT.body, fontSize: 13, lineHeight: 18 },
  })
}
