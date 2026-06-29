import type { Metadata } from 'next'
import LegalPage from '@/components/legal/LegalPage'

export const metadata: Metadata = {
  title: 'Política de Privacidade — LaudoUSG',
  description:
    'Como o LaudoUSG coleta, usa e protege seus dados pessoais e os dados de exames, em conformidade com a LGPD.',
  alternates: { canonical: 'https://laudousg.com/privacy' },
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Política de Privacidade" updatedAt="19 de junho de 2026">
      <p>
        Esta Política de Privacidade descreve como o <strong>LaudoUSG</strong> trata os dados
        pessoais de seus usuários, em conformidade com a Lei Geral de Proteção de Dados (Lei nº
        13.709/2018 — LGPD). Ao utilizar a plataforma, você concorda com as práticas aqui descritas.
      </p>

      <section>
        <h2>1. Dados que coletamos</h2>
        <ul>
          <li>
            <strong>Dados de cadastro:</strong> nome, e-mail e credenciais de acesso, fornecidos no
            momento do registro.
          </li>
          <li>
            <strong>Dados de pagamento:</strong> processados pelo nosso parceiro de pagamentos
            (AbacatePay). Não armazenamos os dados completos do seu cartão.
          </li>
          <li>
            <strong>Conteúdo dos laudos:</strong> os textos, achados e medidas que você dita ou
            digita para gerar laudos.
          </li>
          <li>
            <strong>Dados de uso:</strong> informações técnicas de acesso (logs, dispositivo,
            navegador) necessárias para operar e proteger a plataforma.
          </li>
        </ul>
      </section>

      <section>
        <h2>2. Dados de pacientes</h2>
        <p>
          O LaudoUSG é uma ferramenta de apoio à elaboração de laudos. Recomendamos que você
          <strong> não insira dados que identifiquem diretamente o paciente</strong> (como nome
          completo, CPF ou documentos) nos campos de geração. O conteúdo clínico é tratado como dado
          sensível e usado exclusivamente para gerar o laudo solicitado por você, que permanece o
          controlador desses dados perante o paciente.
        </p>
      </section>

      <section>
        <h2>3. Como usamos os dados</h2>
        <ul>
          <li>Operar a geração de laudos (com e sem IA) e disponibilizar os recursos do seu plano.</li>
          <li>Processar pagamentos e gerenciar sua assinatura.</li>
          <li>Garantir segurança, prevenir fraudes e cumprir obrigações legais.</li>
          <li>Comunicar atualizações relevantes do serviço.</li>
        </ul>
      </section>

      <section>
        <h2>4. Compartilhamento</h2>
        <p>
          Não vendemos seus dados. Compartilhamos informações apenas com prestadores essenciais à
          operação — como provedores de hospedagem, processamento de pagamento (AbacatePay) e
          processamento de linguagem para a geração com IA —, sempre limitados ao necessário e sob
          obrigações de confidencialidade.
        </p>
      </section>

      <section>
        <h2>5. Seus direitos (LGPD)</h2>
        <p>
          Você pode solicitar a qualquer momento: confirmação do tratamento, acesso, correção,
          anonimização, portabilidade ou eliminação dos seus dados, bem como revogar consentimentos.
          Para exercer esses direitos, entre em contato pelo e-mail abaixo.
        </p>
      </section>

      <section>
        <h2>6. Segurança e retenção</h2>
        <p>
          Adotamos medidas técnicas e organizacionais para proteger seus dados. Eles são mantidos
          pelo tempo necessário à prestação do serviço e ao cumprimento de obrigações legais; após
          isso, são eliminados ou anonimizados.
        </p>
      </section>

      <section>
        <h2>7. Contato</h2>
        <p>
          Dúvidas sobre privacidade ou solicitações relativas aos seus dados:{' '}
          <a href="mailto:contato@laudousg.com">contato@laudousg.com</a>.
        </p>
      </section>
    </LegalPage>
  )
}
