import styles from './landing-faq.module.css'

/**
 * FAQ da landing: as objeções que o médico traz antes de assinar.
 *
 * Os temas vêm das dúvidas recorrentes nos sites de concorrentes (teste,
 * plataforma, personalização, integração, assinatura, cancelamento). As
 * RESPOSTAS são do LaudoUSG e só afirmam o que o código e os termos provam.
 * Fontes e verificação: `docs/reviews/2026-09-28-faq-evidence.md`.
 *
 * Server Component: `details`/`summary` nativos, sem JavaScript. Os preços
 * ficam na seção de planos; aqui não se repetem números que mudam.
 */

type Item = { q: string; a: string[] }

const ITEMS: Item[] = [
  {
    q: 'Como começo? Dá para testar antes de assinar?',
    a: [
      'Crie a conta e comece pelo plano Gratuito, sem cobrança e sem prazo para acabar. O limite de laudos de cada plano está em Planos.',
      'Quando fizer sentido para a sua rotina, escolha um plano pago.',
    ],
  },
  {
    q: 'Funciona no computador ou só no celular?',
    a: [
      'A plataforma Web já está disponível: funciona no navegador, sem instalar nada.',
      'Os aplicativos para iPhone e Android, com ditado por voz, estão chegando.',
    ],
  },
  {
    q: 'Como os achados viram um laudo?',
    a: [
      'Na Web, cada exame abre com cards por órgão. O texto combina o modelo do exame com os achados que você seleciona.',
      'O LaudoUSG não interpreta imagens de ultrassom. Revise o laudo inteiro antes de usar, inclusive os trechos de normalidade.',
    ],
  },
  {
    q: 'Posso editar o texto antes de usar?',
    a: [
      'Sim. O laudo pode ser editado livremente antes de copiar.',
      'Se você mudar um achado depois de editar, o sistema mostra a atualização como sugestão, sem apagar o que você escreveu.',
    ],
  },
  {
    q: 'O LaudoUSG assina ou integra com o sistema da clínica?',
    a: [
      'Não. Hoje não há assinatura digital nem integração direta com RIS ou PACS.',
      'Você revisa, copia o texto pronto e assina no sistema que já usa.',
    ],
  },
  {
    q: 'Dá para ajustar ao meu jeito de escrever?',
    a: [
      'Em Preferências, você escolhe o estilo de redação: Clássico, mais detalhado, ou Objetivo, mais direto.',
      'Se uma auxiliar digita para você, as iniciais dela podem sair no fim do laudo.',
    ],
  },
  {
    q: 'O que é a Sala do Auxiliar?',
    a: [
      'É uma tela para a equipe acompanhar os laudos do dia gerados no aplicativo do celular.',
      'A auxiliar entra com um código, sem precisar da sua senha, e pode copiar ou imprimir o laudo.',
    ],
  },
  {
    q: 'Quais calculadoras existem? Elas substituem a minha decisão?',
    a: [
      'Na Web, o laudo traz apoio integrado: TI-RADS, BI-RADS, O-RADS e FIGO, crescimento fetal, percentis do Doppler obstétrico e risco de pré-eclâmpsia. O rastreamento de trissomias está em validação, e a calculadora avulsa de IG e DPP fica nos aplicativos.',
      'O cálculo de pré-eclâmpsia não constitui software certificado pela FMF. A classificação final e a conduta são sempre do médico.',
    ],
  },
  {
    q: 'Tem fidelidade? Como cancelo?',
    a: [
      'Os planos pagos são mensais e sem fidelidade, com pagamento por PIX ou cartão.',
      'Ao cancelar, a renovação é interrompida e o acesso continua até o fim do período já pago.',
    ],
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.q,
    acceptedAnswer: { '@type': 'Answer', text: item.a.join(' ') },
  })),
}

export default function LandingFaq() {
  return (
    <section
      id="faq"
      data-landing-section="faq"
      aria-labelledby="faq-title"
      className="bg-[#f4f6f4] text-slate-950"
    >
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-10 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:gap-16 lg:px-12 lg:py-28">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-28">
            <h2 id="faq-title" className="font-barlow text-[2.2rem] font-extrabold leading-[1.04] tracking-[-0.025em] sm:text-[3rem]">
              Perguntas frequentes
            </h2>
            <p className="mt-4 max-w-[26rem] text-[1rem] leading-relaxed text-slate-600">
              O que os médicos costumam perguntar antes de começar.
            </p>
            <p className="mt-6 text-[0.92rem] text-slate-600">
              Valores e limites de cada plano estão em{' '}
              <a href="#precos" className="font-semibold text-emerald-700 underline decoration-emerald-700/30 underline-offset-4 transition-colors hover:decoration-emerald-700 focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2">
                Planos
              </a>
              .
            </p>
          </div>
        </div>

        <div className="lg:col-span-8">
          <div className={styles.list}>
            {ITEMS.map((item) => (
              <details key={item.q} className={styles.item} data-faq-item>
                <summary className={styles.summary}>
                  <span className={styles.question}>{item.q}</span>
                  <span aria-hidden="true" className={styles.icon} />
                </summary>
                <div className={styles.answer}>
                  {item.a.map((p) => <p key={p}>{p}</p>)}
                </div>
              </details>
            ))}
          </div>
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  )
}
