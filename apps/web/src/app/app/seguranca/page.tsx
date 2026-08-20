'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown } from 'lucide-react'

// Segurança — Política de Privacidade (LGPD) + Termos de Uso. Conteúdo estático
// portado do laudousg.com.br original. Protegido pelo middleware (updateSession).
function AccordionBlock({
  title,
  date,
  children,
}: {
  title: string
  date: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-4 text-left transition-colors hover:bg-gray-50 md:px-6 dark:hover:bg-gray-800"
      >
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          <p className="mt-0.5 text-xs italic text-gray-400 dark:text-gray-500">{date}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 dark:text-gray-500 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && <div className="border-t border-gray-100 px-4 pb-6 md:px-6 dark:border-gray-700">{children}</div>}
    </div>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {children}
    </div>
  )
}

export default function SegurancaPage() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/app/gerar"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar
        </Link>
        <h1 className="mb-1 font-barlow text-2xl font-bold text-gray-900 dark:text-gray-100">Segurança</h1>
        <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Política de Privacidade e Termos de Uso do LaudoUSG
        </p>

        <div className="space-y-4">
          <AccordionBlock title="POLÍTICA DE PRIVACIDADE — LaudoUSG" date="Última atualização: 02/03/2026">
            <div className="space-y-6 pt-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <p>
                O LaudoUSG é uma plataforma destinada ao apoio na elaboração de laudos médicos por meio de
                tecnologias de inteligência artificial. A proteção da privacidade e dos dados dos usuários é
                uma prioridade fundamental.
              </p>

              <SubSection title="1. Coleta de Informações">
                <p className="mb-2">O sistema pode coletar informações fornecidas diretamente pelo usuário, como:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Dados de cadastro (nome, e-mail e credenciais de acesso)</li>
                  <li>Conteúdo inserido para geração de laudos</li>
                  <li>Arquivos de imagem enviados durante o uso da plataforma</li>
                </ul>
                <p className="mt-2">
                  O LaudoUSG não tem como finalidade armazenar dados pessoais identificáveis de pacientes,
                  tais como nome, CPF, endereço ou data de nascimento.
                </p>
              </SubSection>

              <SubSection title="2. Uso das Informações">
                <p className="mb-2">As informações são utilizadas exclusivamente para:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Permitir o funcionamento da plataforma</li>
                  <li>Gerar laudos durante a sessão ativa</li>
                  <li>Melhorar a experiência do usuário</li>
                  <li>Garantir segurança e integridade do sistema</li>
                </ul>
                <p className="mt-2">O conteúdo inserido não é utilizado para identificação de pacientes.</p>
              </SubSection>

              <SubSection title="3. Armazenamento de Dados">
                <p className="mb-2">O sistema foi projetado para minimizar retenção de dados sensíveis.</p>
                <p className="mb-2">Dependendo da configuração da conta ou funcionalidades utilizadas:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Informações podem ser armazenadas temporariamente para funcionamento da sessão</li>
                  <li>Dados podem ser armazenados para histórico de laudos quando essa funcionalidade estiver ativa pelo usuário</li>
                </ul>
                <p className="mt-2">
                  O usuário é responsável por evitar a inserção de dados pessoais identificáveis de pacientes.
                </p>
              </SubSection>

              <SubSection title="4. Compartilhamento de Dados">
                <p className="mb-2">
                  O LaudoUSG não vende, comercializa ou compartilha dados pessoais com terceiros, exceto quando
                  necessário para:
                </p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Cumprimento de obrigações legais</li>
                  <li>Operação técnica da plataforma (provedores de infraestrutura)</li>
                  <li>Proteção contra fraudes ou uso indevido</li>
                </ul>
              </SubSection>

              <SubSection title="5. Segurança da Informação">
                <p className="mb-2">São adotadas medidas técnicas e organizacionais razoáveis para proteger os dados contra:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Acesso não autorizado</li>
                  <li>Alteração indevida</li>
                  <li>Divulgação ou destruição não autorizada</li>
                </ul>
                <p className="mt-2">Apesar dos esforços, nenhum sistema digital é absolutamente seguro.</p>
              </SubSection>

              <SubSection title="6. Base Legal (LGPD)">
                <p className="mb-2">O tratamento de dados ocorre com base em:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Execução de contrato (uso da plataforma)</li>
                  <li>Legítimo interesse (melhoria do serviço)</li>
                  <li>Consentimento quando aplicável</li>
                </ul>
                <p className="mt-2">Em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).</p>
              </SubSection>

              <SubSection title="7. Direitos do Usuário">
                <p className="mb-2">Nos termos da LGPD, o usuário pode solicitar:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Acesso aos seus dados</li>
                  <li>Correção de informações</li>
                  <li>Exclusão de dados quando aplicável</li>
                  <li>Informações sobre tratamento de dados</li>
                </ul>
                <p className="mt-2">Solicitações podem ser realizadas pelo contato informado abaixo.</p>
              </SubSection>

              <SubSection title="8. Responsabilidade do Usuário">
                <p className="mb-2">O LaudoUSG é uma ferramenta de apoio profissional.</p>
                <p className="mb-2">O usuário é responsável por:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Revisar o conteúdo gerado</li>
                  <li>Garantir conformidade com normas médicas</li>
                  <li>Evitar inserção de dados pessoais identificáveis de pacientes</li>
                </ul>
              </SubSection>

              <SubSection title="9. Alterações desta Política">
                <p>
                  Esta Política pode ser atualizada periodicamente. A versão mais recente estará sempre
                  disponível na plataforma.
                </p>
              </SubSection>

              <SubSection title="10. Contato">
                <p>E-mail: contato@luizprazeres.com.br</p>
                <p>Responsável: Luiz Paulo de Souza Prazeres</p>
              </SubSection>
            </div>
          </AccordionBlock>

          <AccordionBlock title="TERMOS DE USO — LaudoUSG" date="Última atualização: 02/03/2026">
            <div className="space-y-6 pt-5 text-sm leading-relaxed text-gray-700 dark:text-gray-300">
              <p>Ao utilizar a plataforma LaudoUSG, você concorda com os seguintes termos e condições de uso.</p>

              <SubSection title="1. Aceitação dos Termos">
                <p>
                  O acesso e uso da plataforma implica na aceitação integral destes Termos de Uso e da
                  Política de Privacidade.
                </p>
              </SubSection>

              <SubSection title="2. Descrição do Serviço">
                <p>
                  O LaudoUSG é uma ferramenta de apoio à elaboração de laudos médicos utilizando inteligência
                  artificial. O serviço não substitui a responsabilidade profissional do usuário.
                </p>
              </SubSection>

              <SubSection title="3. Responsabilidades do Usuário">
                <p className="mb-2">O usuário se compromete a:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Utilizar a plataforma de forma ética e legal</li>
                  <li>Manter a confidencialidade de suas credenciais de acesso</li>
                  <li>Revisar e validar todo conteúdo gerado pela plataforma</li>
                  <li>Não inserir dados pessoais identificáveis de pacientes</li>
                  <li>Cumprir todas as normas e regulamentações médicas aplicáveis</li>
                </ul>
              </SubSection>

              <SubSection title="4. Limitações de Responsabilidade">
                <p className="mb-2">O LaudoUSG não se responsabiliza por:</p>
                <ul className="ml-4 list-inside list-disc space-y-1">
                  <li>Erros ou imprecisões no conteúdo gerado</li>
                  <li>Decisões clínicas baseadas exclusivamente no conteúdo gerado</li>
                  <li>Danos decorrentes do uso inadequado da plataforma</li>
                  <li>Interrupções temporárias do serviço</li>
                </ul>
              </SubSection>

              <SubSection title="5. Propriedade Intelectual">
                <p>
                  Todos os direitos sobre a plataforma, incluindo código, design e marca, pertencem ao LaudoUSG.
                  O conteúdo gerado pelo usuário permanece de sua propriedade.
                </p>
              </SubSection>

              <SubSection title="6. Modificações do Serviço">
                <p>
                  O LaudoUSG reserva-se o direito de modificar, suspender ou descontinuar qualquer aspecto da
                  plataforma a qualquer momento, com ou sem aviso prévio.
                </p>
              </SubSection>

              <SubSection title="7. Rescisão">
                <p>
                  O LaudoUSG pode suspender ou encerrar o acesso do usuário em caso de violação destes termos
                  ou uso inadequado da plataforma.
                </p>
              </SubSection>

              <SubSection title="8. Lei Aplicável">
                <p>
                  Estes termos são regidos pelas leis brasileiras. Quaisquer disputas serão resolvidas no
                  foro da comarca de São Paulo, SP.
                </p>
              </SubSection>

              <SubSection title="9. Contato">
                <p>
                  Para dúvidas ou questões sobre estes termos, entre em contato através do e-mail:
                  contato@luizprazeres.com.br
                </p>
              </SubSection>
            </div>
          </AccordionBlock>
        </div>
      </div>
    </div>
  )
}
