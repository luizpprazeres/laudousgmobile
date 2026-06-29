import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Termos de Uso — LaudoUSG',
  description:
    'Termos e condições de uso da plataforma LaudoUSG para geração de laudos de ultrassonografia.',
  alternates: { canonical: 'https://laudousg.com/terms' },
}

export default function TermsPage() {
  return (
    <LegalPage title="Termos de Uso" updatedAt="19 de junho de 2026">
      <p>
        Estes Termos de Uso regem o acesso e a utilização da plataforma <strong>LaudoUSG</strong>.
        Ao criar uma conta ou usar o serviço, você declara ter lido e concordado com estes termos.
      </p>

      <section>
        <h2>1. O serviço</h2>
        <p>
          O LaudoUSG é uma ferramenta de apoio à elaboração de laudos de ultrassonografia, oferecendo
          geração de laudos de forma determinística (por formulário) e com inteligência artificial,
          além de recursos de edição e exportação.
        </p>
      </section>

      <section>
        <h2>2. Responsabilidade profissional</h2>
        <p>
          O LaudoUSG é uma ferramenta de <strong>apoio</strong> e não substitui o julgamento clínico.
          Todo laudo gerado deve ser <strong>revisado e validado pelo profissional responsável</strong>
          antes de qualquer uso clínico ou emissão. A responsabilidade pelo conteúdo final, pelo
          diagnóstico e pela conduta é integralmente do profissional usuário.
        </p>
      </section>

      <section>
        <h2>3. Cadastro e conta</h2>
        <ul>
          <li>Você deve fornecer informações verdadeiras e manter suas credenciais em sigilo.</li>
          <li>Você é responsável pelas atividades realizadas na sua conta.</li>
          <li>O uso é destinado a profissionais e contextos legítimos de saúde.</li>
        </ul>
      </section>

      <section>
        <h2>4. Planos e pagamento</h2>
        <ul>
          <li>
            O plano <strong>Gratuito</strong> oferece 10 laudos vitalícios, sem cobrança.
          </li>
          <li>
            Os planos <strong>Essencial</strong> e <strong>Profissional</strong> são assinaturas
            mensais recorrentes, cobradas via AbacatePay (PIX ou cartão).
          </li>
          <li>Não há fidelidade: você pode cancelar a qualquer momento.</li>
          <li>
            O cancelamento encerra a renovação; o acesso ao plano permanece até o fim do período já
            pago.
          </li>
        </ul>
      </section>

      <section>
        <h2>5. Uso aceitável</h2>
        <p>
          É vedado usar a plataforma para fins ilícitos, tentar burlar limites de uso, realizar
          engenharia reversa, ou comprometer a segurança e a integridade do serviço.
        </p>
      </section>

      <section>
        <h2>6. Disponibilidade e alterações</h2>
        <p>
          Empregamos esforços para manter o serviço disponível, mas ele é fornecido &ldquo;como
          está&rdquo;, podendo passar por manutenções e atualizações. Podemos ajustar recursos,
          planos e estes termos, comunicando alterações relevantes.
        </p>
      </section>

      <section>
        <h2>7. Privacidade</h2>
        <p>
          O tratamento de dados pessoais segue a nossa{' '}
          <a href="/privacy">Política de Privacidade</a>, em conformidade com a LGPD.
        </p>
      </section>

      <section>
        <h2>8. Contato</h2>
        <p>
          Dúvidas sobre estes termos: <a href="mailto:contato@laudousg.com">contato@laudousg.com</a>.
        </p>
      </section>
    </LegalPage>
  )
}
