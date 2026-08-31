import 'server-only'
import { createClient } from '@/lib/supabase/server'
import { codigoDoEstilo, type WritingStyleCode } from './estilos'

export async function estiloDaConta(userId: string): Promise<WritingStyleCode> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('profiles')
    .select('default_writing_style_id')
    .eq('id', userId)
    .maybeSingle()
  return codigoDoEstilo(data?.default_writing_style_id)
}
