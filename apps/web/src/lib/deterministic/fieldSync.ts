/**
 * Vínculo entre campos irmãos (`Field.sync`) — puro, sem React, para a UI e os testes.
 * Ex.: localização do mioma ↔ categoria FIGO: escolher uma preenche ou restringe a outra.
 */
import type { Field, OrganState } from './types'

/** Chave do irmão no mesmo grupo: `mioma.sim.figo` → `mioma.sim.classificacao`. */
export function siblingKey(fullKey: string, siblingFieldKey: string): string {
  const i = fullKey.lastIndexOf('.')
  return i < 0 ? siblingFieldKey : `${fullKey.slice(0, i + 1)}${siblingFieldKey}`
}

/** Patch de estado ao gravar `value` em `field` (chave completa `fullKey`), já com o irmão vinculado. */
export function syncPatch(field: Field, fullKey: string, value: string, state: OrganState): Record<string, string> {
  const patch: Record<string, string> = { [fullKey]: value }
  if (!field.sync) return patch
  const alvo = field.sync.map[value]
  if (alvo === undefined) return patch
  const irmao = siblingKey(fullKey, field.sync.key)
  if (typeof alvo === 'string') {
    patch[irmao] = alvo
  } else {
    const atual = typeof state[irmao] === 'string' ? String(state[irmao]) : ''
    if (atual && !alvo.includes(atual)) patch[irmao] = ''
  }
  return patch
}

/**
 * Opções permitidas para `field` pelos irmãos que o restringem (lista no `sync` deles);
 * null = sem restrição. O valor atual nunca some da lista.
 */
export function allowedValues(field: Field, fullKey: string, siblings: readonly Field[], state: OrganState): Set<string> | null {
  let allowed = null as Set<string> | null
  for (const irmao of siblings) {
    if (irmao.sync?.key !== field.key) continue
    const valorIrmao = state[siblingKey(fullKey, irmao.key)]
    const alvo = typeof valorIrmao === 'string' ? irmao.sync.map[valorIrmao] : undefined
    if (alvo === undefined || typeof alvo === 'string') continue
    const lista = new Set<string>([...alvo])
    allowed = allowed ? new Set([...allowed].filter((v) => lista.has(v))) : lista
  }
  const atual = state[fullKey]
  if (allowed && typeof atual === 'string' && atual) allowed.add(atual)
  return allowed
}
