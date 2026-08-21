import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listarCategorias } from '@/lib/biblioteca/cliente'
import { BibliotecaWorkspace } from '@/components/biblioteca/BibliotecaWorkspace'
import type { CategoriaDaBiblioteca } from '@/lib/biblioteca/tipos'

export const dynamic = 'force-dynamic'

/**
 * /app/biblioteca — o modelo dos laudos do médico.
 *
 * As categorias vêm no SERVIDOR, no primeiro render: a lista é curta, muda
 * pouco, e buscá-la no cliente faria a tela abrir vazia e piscar. O detalhe de
 * cada categoria é grande e depende de escolha, então esse sim é buscado sob
 * demanda.
 */
export default async function BibliotecaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?redirect=/app/biblioteca')

  const r = await listarCategorias()
  const corpo = r.ok ? (r.corpo as { categorias?: CategoriaDaBiblioteca[] }) : null
  const categorias = corpo?.categorias ?? []

  return <BibliotecaWorkspace categorias={categorias} />
}
