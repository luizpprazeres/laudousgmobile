import { useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import * as Haptics from 'expo-haptics'
import * as FileSystem from 'expo-file-system'
import * as ImagePicker from 'expo-image-picker'
import type { Audio } from 'expo-av'
import { Sheet } from '@/ui/Sheet'
import { FONT, type ColorTokens } from '@/ui/tokens'
import { useColorTokens } from '@/ui/useColorTokens'
import { ensureMicPermission, startRecording, stopRecording, uploadAudio } from '@/features/generate/transcribe'
import { analyzeImages, canAnalyzeCategory, formatBiometric, mergeBiometric, type BiometricData, type ImagingCategory } from '@/features/imaging/imageAnalysis'
import { connectCompanion, restoreCompanionConnection, sendCompanionStructuredFindings, sendCompanionText, sendCompanionTranscript, type CompanionConnection } from './companion'

type Props = { open: boolean; onClose: () => void; categoryId: string; onConnectionChanged?: (connection: CompanionConnection | null) => void }

export function CompanionSheet({ open, onClose, categoryId, onConnectionChanged }: Props) {
  const t = useColorTokens()
  const styles = useMemo(() => makeStyles(t), [t])
  const [code, setCode] = useState('')
  const [message, setMessage] = useState('')
  const [connection, setConnection] = useState<CompanionConnection | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [dictated, setDictated] = useState(false)
  const [recording, setRecording] = useState<Audio.Recording | null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [transcribing, setTranscribing] = useState(false)
  const [imagingBusy, setImagingBusy] = useState(false)
  const [imageFindings, setImageFindings] = useState<{ data: BiometricData; summary: string } | null>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)

  useEffect(() => {
    if (!open || connection) return
    restoreCompanionConnection().then(setConnection).catch(() => undefined)
  }, [connection, open])

  useEffect(() => {
    onConnectionChanged?.(connection)
    if (connection) onClose()
  }, [connection, onClose, onConnectionChanged])

  useEffect(() => () => {
    const current = recordingRef.current
    if (!current) return
    recordingRef.current = null
    stopRecording(current)
      .then((uri) => FileSystem.deleteAsync(uri, { idempotent: true }))
      .catch(() => undefined)
  }, [])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try { await action() } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }

  const toggleRecording = async () => {
    if (!recordingRef.current) {
      await run(async () => {
        await ensureMicPermission()
        const next = await startRecording((_level, durationMillis) => setRecordingSeconds(Math.floor(durationMillis / 1000)))
        recordingRef.current = next
        setRecording(next)
        setRecordingSeconds(0)
        setSent(false)
      })
      return
    }

    const current = recordingRef.current
    recordingRef.current = null
    setRecording(null)
    setTranscribing(true)
    setError(null)
    let uri: string | null = null
    try {
      uri = await stopRecording(current)
      const result = await uploadAudio(uri)
      setMessage(result.transcript)
      setDictated(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      if (uri) await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined)
      setTranscribing(false)
    }
  }

  const analyzePhotos = async (source: 'camera' | 'library') => {
    if (!canAnalyzeCategory(categoryId)) return
    setError(null)
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      quality: 0.7,
      base64: true,
      exif: false,
      ...(source === 'library' ? { allowsMultipleSelection: true, selectionLimit: 3 } : {}),
    }
    const picked = source === 'camera'
      ? await ImagePicker.launchCameraAsync(options)
      : await ImagePicker.launchImageLibraryAsync(options)
    if (picked.canceled) return
    const images = picked.assets.flatMap((asset) => asset.base64 ? [asset.base64] : [])
    if (images.length === 0) {
      setError('Não consegui ler as imagens selecionadas.')
      return
    }
    setImagingBusy(true)
    try {
      const category = categoryId as ImagingCategory
      const results = await analyzeImages(images, category, undefined, {
        includeDoppler: category === 'OBSTETRICA' || category === 'MORFOLOGICO',
      })
      const summary = formatBiometric(results, category)
      if (!summary.trim()) throw new Error('Não encontrei medidas nas imagens.')
      setImageFindings({ data: mergeBiometric(results), summary })
      setSent(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setImagingBusy(false)
    }
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
            {canAnalyzeCategory(categoryId) ? (
              <>
                <View style={styles.imageActions}>
                  <Pressable
                    disabled={busy || imagingBusy || transcribing || Boolean(recording)}
                    onPress={() => analyzePhotos('camera')}
                    style={({ pressed }) => [styles.record, styles.imageAction, (pressed || busy || imagingBusy) && { opacity: 0.6 }]}
                  >
                    {imagingBusy ? <ActivityIndicator color={t.brand} /> : <Text style={styles.recordText}>Câmera</Text>}
                  </Pressable>
                  <Pressable
                    disabled={busy || imagingBusy || transcribing || Boolean(recording)}
                    onPress={() => analyzePhotos('library')}
                    style={({ pressed }) => [styles.record, styles.imageAction, (pressed || busy || imagingBusy) && { opacity: 0.6 }]}
                  >
                    <Text style={styles.recordText}>Galeria (até 3)</Text>
                  </Pressable>
                </View>
                {imageFindings ? (
                  <View style={styles.findingsCard}>
                    <Text style={styles.findingsTitle}>{categoryId === 'TIREOIDE' ? 'Tireoide e nódulos encontrados' : categoryId === 'MAMARIA' ? 'Achados mamários encontrados' : categoryId === 'DOPPLER_CAROTIDAS' ? 'Medidas carotídeas encontradas' : 'Medidas encontradas'} — revise antes de enviar</Text>
                    <Text style={styles.findingsText}>{imageFindings.summary}</Text>
                    <Pressable
                      disabled={busy}
                      onPress={() => run(async () => {
                        await sendCompanionStructuredFindings(connection, categoryId as ImagingCategory, imageFindings.data, imageFindings.summary)
                        setImageFindings(null)
                        setSent(true)
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
                      })}
                      style={({ pressed }) => [styles.primary, (pressed || busy) && { opacity: 0.6 }]}
                    >
                      <Text style={styles.primaryText}>Enviar medidas para a web</Text>
                    </Pressable>
                  </View>
                ) : null}
              </>
            ) : null}
            <Pressable
              disabled={busy || transcribing}
              onPress={toggleRecording}
              style={({ pressed }) => [styles.record, recording && styles.recording, (pressed || busy || transcribing) && { opacity: 0.6 }]}
            >
              {transcribing
                ? <ActivityIndicator color={t.brand} />
                : <Text style={[styles.recordText, recording && styles.recordingText]}>{recording ? `Parar ditado (${recordingSeconds}s)` : 'Ditar para a web'}</Text>}
            </Pressable>
            {transcribing ? <Text style={styles.helper}>Transcrevendo… o áudio será descartado após esta etapa.</Text> : null}
            <Pressable
              disabled={busy || transcribing || Boolean(recording) || !message.trim()}
              onPress={() => run(async () => {
                await (dictated ? sendCompanionTranscript(connection, message) : sendCompanionText(connection, message))
                setMessage('')
                setDictated(false)
                setSent(true)
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined)
              })}
              style={({ pressed }) => [styles.primary, (pressed || busy || transcribing || Boolean(recording) || !message.trim()) && { opacity: 0.55 }]}
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
    record: { minHeight: 46, borderRadius: 16, borderWidth: 1, borderColor: t.brand, alignItems: 'center', justifyContent: 'center', backgroundColor: t.card },
    imageActions: { flexDirection: 'row', gap: 10 },
    imageAction: { flex: 1 },
    recording: { borderColor: t.danger },
    recordText: { color: t.brand, fontFamily: FONT.bold, fontSize: 14 },
    recordingText: { color: t.danger },
    helper: { color: t.text2, textAlign: 'center', fontFamily: FONT.body, fontSize: 12 },
    findingsCard: { borderRadius: 16, borderWidth: 1, borderColor: t.separator, padding: 14, gap: 10, backgroundColor: t.card },
    findingsTitle: { color: t.brand, fontFamily: FONT.bold, fontSize: 13 },
    findingsText: { color: t.text2, fontFamily: FONT.body, fontSize: 12, lineHeight: 17 },
    primary: { minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: t.brand },
    primaryText: { color: '#fff', fontFamily: FONT.bold, fontSize: 15 },
    okCard: { borderRadius: 16, padding: 16, gap: 6, backgroundColor: t.brandLight },
    okTitle: { color: t.brand, fontFamily: FONT.bold, fontSize: 16 },
    success: { color: t.brand, textAlign: 'center', fontFamily: FONT.bold, fontSize: 13 },
    error: { color: t.danger, fontFamily: FONT.body, fontSize: 13, lineHeight: 18 },
  })
}
