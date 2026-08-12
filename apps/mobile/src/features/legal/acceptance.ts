import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { LEGAL_VERSIONS } from "@/legal/documents";

/**
 * Aceite legal (Termos + Privacidade + Disclaimer Médico).
 *
 * Espelha o app iOS (ProfileService.recordLegalAcceptance / AppState.needsLegalAcceptance):
 * as colunas vivem em `profiles` e são lidas/gravadas via supabase-js direto (RLS
 * `profiles_select_own`/`profiles_update_own`). O `/api/me/profile` ainda não expõe
 * esses campos — follow-up de backend registrado em docs/parity/android-gap-analysis.md.
 *
 * Cache local (AsyncStorage, por usuário): evita bloquear o app a cada start e permite
 * fail-CLOSED quando o aceite nunca foi confirmado (review Dex1+Dex2 04/07): sem
 * confirmação local nem remota, o app não abre a ferramenta clínica.
 */

export type LegalAcceptance = {
  terms_accepted_at: string | null;
  terms_version_accepted: string | null;
  privacy_version_accepted: string | null;
  medical_disclaimer_version_accepted: string | null;
  onboarding_completed_at: string | null;
  name: string | null;
};

const COLUMNS =
  "terms_accepted_at, terms_version_accepted, privacy_version_accepted, medical_disclaimer_version_accepted, onboarding_completed_at, name";

const cacheKey = (userId: string) => `laudousg.legal_ok.${userId}`;
const versionsSignature = () =>
  `${LEGAL_VERSIONS.terms}|${LEGAL_VERSIONS.privacy}|${LEGAL_VERSIONS.disclaimer}`;

export async function fetchLegalAcceptance(
  userId: string,
): Promise<LegalAcceptance> {
  const { data, error } = await supabase
    .from("profiles")
    .select(COLUMNS)
    .eq("id", userId)
    .single();
  if (error) throw new Error(`legal_acceptance_fetch: ${error.message}`);
  return data as LegalAcceptance;
}

/** Mesmas regras do iOS: falta de aceite OU versão divergente exige novo aceite. */
export function needsLegalAcceptance(a: LegalAcceptance): boolean {
  if (!a.terms_accepted_at) return true;
  if (a.terms_version_accepted !== LEGAL_VERSIONS.terms) return true;
  if (a.privacy_version_accepted !== LEGAL_VERSIONS.privacy) return true;
  if (a.medical_disclaimer_version_accepted !== LEGAL_VERSIONS.disclaimer)
    return true;
  return false;
}

/**
 * Grava o aceite e CONFIRMA que exatamente 1 linha foi atualizada (com RLS, um
 * update sem match retorna sucesso vazio — não pode fechar o gate nesse caso).
 */
export async function recordLegalAcceptance(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_version_accepted: LEGAL_VERSIONS.terms,
      privacy_version_accepted: LEGAL_VERSIONS.privacy,
      medical_disclaimer_version_accepted: LEGAL_VERSIONS.disclaimer,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id");
  if (error) throw new Error(`legal_acceptance_record: ${error.message}`);
  if (!data || data.length !== 1) {
    throw new Error("legal_acceptance_record: nenhuma linha atualizada (RLS/perfil ausente)");
  }
  await setCachedAccepted(userId);
}

/** Onboarding (paridade iOS AppState.needsOnboarding). */
export function needsOnboarding(a: LegalAcceptance): boolean {
  return a.onboarding_completed_at === null;
}

/** Marca onboarding concluído (espelho iOS markOnboardingComplete; update verificado). */
export async function markOnboardingComplete(userId: string): Promise<void> {
  const { data, error } = await supabase
    .from("profiles")
    .update({
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id");
  if (error) throw new Error(`onboarding_complete: ${error.message}`);
  if (!data || data.length !== 1) {
    throw new Error("onboarding_complete: nenhuma linha atualizada");
  }
  await setCachedOnboardingDone(userId);
}

const onboardingKey = (userId: string) => `laudousg.onboarding_ok.${userId}`;

export async function hasCachedOnboardingDone(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(onboardingKey(userId))) === "1";
  } catch {
    return false;
  }
}

export async function setCachedOnboardingDone(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(onboardingKey(userId), "1");
  } catch {
    // cache é otimização
  }
}

/** true se este usuário já teve aceite CONFIRMADO (leitura ou gravação) nas versões vigentes. */
export async function hasCachedAcceptance(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(cacheKey(userId))) === versionsSignature();
  } catch {
    return false;
  }
}

export async function setCachedAccepted(userId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(cacheKey(userId), versionsSignature());
  } catch {
    // cache é otimização — falha silenciosa
  }
}

export async function clearCachedAcceptance(userId: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(cacheKey(userId));
  } catch {
    // idem
  }
}
