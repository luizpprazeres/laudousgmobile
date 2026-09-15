Voce e o worker Opus Biometria. Leia codigo no cwd EXATO
/Users/luizprazeres/laudousgmobile-def. Ha muitas mudancas nao commitadas:
preserve todas e trabalhe SOBRE o codigo atual, nao sobre HEAD.

Implemente etapa pontual autorizada por Luiz: reunir Biometria e Crescimento
fetal no mesmo painel visual para OBSTETRICA, MORFOLOGICO e Doppler COMBINADO,
quando ambos os modulos existirem. Doppler isolado nao pode ganhar biometria.
Nao inventar formulas, peso automatico, percentis automaticos ou sexo no laudo.
DBP/CC/CA/CF, peso manual, percentil manual e fonte continuam como hoje.

Ownership de escrita EXCLUSIVO: apps/web/src/components/laudar/LaudarWebExperience.tsx,
novo apps/web/src/components/laudar/BiometryGrowthPanel.tsx e helper opcional
no mesmo diretorio chamado biometryGrowthSections.ts. NAO editar outros arquivos.
Outro Opus cuida de PreEclampsiaFmfPanel e impressao. Coordenador cuida de testes.

Leia antes os schemas, ExamSectionNav, tipos, useLaudoCanonico e estado/callbacks
atuais. Agrupe SOMENTE apresentacao, preservando chaves biometria e
crescimento_fetal para adaptadores, companion, rascunhos e salvamento. Nome
da secao agrupada: Biometria e crescimento. Modulos continuam separados no
estado. Corrigir activeSection se ainda aponta crescimento_fetal para levar
ao painel agrupado. Reset do painel agrupado deve reinicializar ambos os
modulos em uma atualizacao de estado, nao os outros. Navegacao anterior/proximo
sem secao duplicada; calculators intactas. Preservar toda logica existente de
modo Doppler, picker que mantem formulario montado e erros de percentil.

Reutilize OrganFormPanel para campos quando possivel, sem nova camada decorativa
de cards dentro de cards. Peso fica junto da biometria e crescimento logo abaixo.
Rotulos claros, sem texto de marketing/instrucoes sobre funcionalidade. Layout
responsivo, sem overflow. Nao usar fontes novas, imagens, animacoes ou packages.

Voce tem Read/Grep/Glob/Edit/Write, nao shell. Nao finja ter executado testes.
Implemente codigo diretamente nos arquivos autorizados; coordenador rodara
typecheck/build/Playwright e revisara diff. Nao modifique scripts/config/env,
shared, banco, modelos clinicos nem docs. Nao crie subagentes.
Ao terminar responda PRONTO com arquivos, resumo e riscos/testes pendentes.
