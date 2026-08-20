import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Excluir conta e dados — LaudoUSG',
  description:
    'Como excluir sua conta LaudoUSG e todos os dados associados, pelo próprio app ou por solicitação via e-mail.',
  alternates: { canonical: 'https://www.laudousg.com.br/excluir-conta' },
}

export default function ExcluirContaPage() {
  return (
    <LegalPage title="Excluir conta e dados" updatedAt="4 de julho de 2026">
      <p>
        Você pode excluir sua conta do <strong>LaudoUSG</strong> — e todos os dados associados a
        ela — a qualquer momento, por dois caminhos.
      </p>

      <section>
        <h2>1. Pelo próprio aplicativo (recomendado)</h2>
        <ol>
          <li>Abra o app LaudoUSG e faça login.</li>
          <li>
            Toque no menu (☰) e acesse <strong>Preferências</strong>.
          </li>
          <li>
            Na seção <strong>Zona de risco</strong>, toque em <strong>Excluir minha conta</strong>.
          </li>
          <li>
            Confirme digitando <strong>EXCLUIR</strong>. A exclusão é imediata e definitiva.
          </li>
        </ol>
      </section>

      <section>
        <h2>2. Por solicitação via e-mail</h2>
        <p>
          Se você não tiver mais acesso ao app, envie um e-mail para{' '}
          <a href="mailto:contato@laudousg.com?subject=Exclus%C3%A3o%20de%20conta">
            contato@laudousg.com
          </a>{' '}
          a partir do endereço cadastrado na conta, com o assunto{' '}
          <strong>&quot;Exclusão de conta&quot;</strong>. Processaremos a solicitação em até 7 dias
          úteis e confirmaremos por e-mail.
        </p>
      </section>

      <section>
        <h2>O que é excluído</h2>
        <ul>
          <li>Dados cadastrais (nome, e-mail, credenciais);</li>
          <li>Laudos, ditados transcritos e frases personalizadas;</li>
          <li>Preferências, histórico de uso e sessões da Sala do Auxiliar.</li>
        </ul>
        <p>
          A exclusão é <strong>permanente e irreversível</strong>. Podemos reter registros mínimos
          quando houver obrigação legal (por exemplo, registros de acesso exigidos pelo Marco Civil
          da Internet) ou necessidade de prevenção a fraudes, pelo prazo legal aplicável — conforme
          descrito na nossa <a href="/privacy">Política de Privacidade</a>.
        </p>
      </section>

      <section>
        <h2>Dados de pagamento</h2>
        <p>
          Assinaturas contratadas via App Store, Google Play ou parceiro de pagamentos devem ser
          canceladas na respectiva plataforma; a exclusão da conta LaudoUSG não cancela cobranças
          administradas por essas plataformas.
        </p>
      </section>
    </LegalPage>
  )
}
