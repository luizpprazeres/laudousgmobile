import { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { createUserPhrase, deleteUserPhrase, getUserPhrases, updateUserPhrase, type UserPhrase } from '@/lib/api'
import { PageHeader } from '@/ui/PageHeader'
import { FONT, type ColorTokens } from '@/ui/tokens'
import { useColorTokens } from '@/ui/useColorTokens'

export default function FrasesPessoaisScreen() {
  const t = useColorTokens(); const styles = useMemo(() => makeStyles(t), [t]); const insets = useSafeAreaInsets()
  const [items, setItems] = useState<UserPhrase[]>([]); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState<UserPhrase | null>(null); const [title, setTitle] = useState(''); const [body, setBody] = useState('')
  const load = useCallback(async () => { try { setItems(await getUserPhrases()) } catch (e) { Alert.alert('Não foi possível carregar', e instanceof Error ? e.message : String(e)) } finally { setLoading(false) } }, [])
  useEffect(() => { void load() }, [load])
  function start(item?: UserPhrase) { setEditing(item ?? null); setTitle(item?.title ?? ''); setBody(item?.body ?? '') }
  async function save() { if (!title.trim() || !body.trim()) return Alert.alert('Preencha o título e a frase.'); setSaving(true); try { const input = { title: title.trim(), body: body.trim(), category_code: editing?.category_code ?? null }; if (editing) await updateUserPhrase(editing.id, input); else await createUserPhrase(input); start(); await load() } catch (e) { Alert.alert('Não foi possível salvar', e instanceof Error ? e.message : String(e)) } finally { setSaving(false) } }
  function remove(item: UserPhrase) { Alert.alert('Excluir frase?', item.title, [{ text: 'Cancelar', style: 'cancel' }, { text: 'Excluir', style: 'destructive', onPress: async () => { try { await deleteUserPhrase(item.id); await load() } catch (e) { Alert.alert('Não foi possível excluir', e instanceof Error ? e.message : String(e)) } } }]) }
  return <View style={[styles.page, { paddingBottom: insets.bottom }]}><PageHeader title="Minhas frases" /><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.editor}><Text style={styles.heading}>{editing ? 'Editar frase' : 'Nova frase'}</Text><TextInput value={title} onChangeText={setTitle} placeholder="Título" placeholderTextColor={t.textMute} style={styles.input} /><TextInput value={body} onChangeText={setBody} placeholder="Texto da frase" placeholderTextColor={t.textMute} style={[styles.input, styles.body]} multiline /><View style={styles.actions}><Pressable onPress={() => void save()} disabled={saving} style={[styles.primary, saving && styles.disabled]}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryText}>Salvar</Text>}</Pressable>{editing ? <Pressable onPress={() => start()} style={styles.secondary}><Text style={styles.secondaryText}>Cancelar</Text></Pressable> : null}</View></View>
    <Text style={styles.caption}>As alterações aparecem também no iPhone, na web e na Sala.</Text>
    {loading ? <ActivityIndicator color={t.brand} /> : items.map((item) => <Pressable key={item.id} onPress={() => start(item)} onLongPress={() => remove(item)} style={styles.card}><Text style={styles.title}>{item.title}</Text><Text style={styles.text} numberOfLines={3}>{item.body}</Text><Text style={styles.hint}>Toque para editar · segure para excluir</Text></Pressable>)}
  </ScrollView></View>
}

function makeStyles(t: ColorTokens) { return StyleSheet.create({ page: { flex: 1, backgroundColor: t.bg }, content: { padding: 16, gap: 12 }, editor: { padding: 16, borderRadius: 16, backgroundColor: t.card, borderWidth: 1, borderColor: t.separator, gap: 10 }, heading: { fontFamily: FONT.bold, fontSize: 17, color: t.text }, input: { borderWidth: 1, borderColor: t.separator, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: t.text, backgroundColor: t.bg }, body: { minHeight: 96, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: 8 }, primary: { minWidth: 96, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 12, backgroundColor: t.brand, paddingHorizontal: 16 }, primaryText: { fontFamily: FONT.bold, color: '#fff' }, secondary: { justifyContent: 'center', paddingHorizontal: 12 }, secondaryText: { fontFamily: FONT.medium, color: t.textSec }, disabled: { opacity: .55 }, caption: { fontSize: 12, lineHeight: 17, color: t.textMute }, card: { padding: 14, borderRadius: 14, backgroundColor: t.card, borderWidth: 1, borderColor: t.separator }, title: { fontFamily: FONT.bold, fontSize: 15, color: t.text }, text: { marginTop: 4, fontSize: 13, lineHeight: 18, color: t.textSec }, hint: { marginTop: 8, fontSize: 10, color: t.textMute } }) }
