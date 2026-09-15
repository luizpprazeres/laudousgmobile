Voce e o worker Opus Impressao. Cwd EXATO /Users/luizprazeres/laudousgmobile-def.
Leia codigo atual dirty e preserve todas as alteracoes existentes.

Implemente uma folha imprimivel de resultado de pre-eclampsia na web. Ownership
EXCLUSIVO: apps/web/src/components/laudar/PreEclampsiaFmfPanel.tsx e novo
apps/web/src/components/laudar/PreEclampsiaPrintSheet.tsx. NAO editar outros
arquivos. Outro worker edita LaudarWebExperience para agrupar biometria.

Leia PeWebCalculo/PeResultado, painel atual e UI existente. Nao mudar formulas,
risco/umEmN, limites, insertBloco, texto clinico, flags ou recomendacoes. Fonte
de resultado e o calculo ATUAL, nao insertedBlock antigo. Sem novos riscos ou
graficos nao validados. Nao alegar software certificado ou comparacao FMF validada.

Somente quando calculo valido, disponibilize botao icon+texto de previsualizar
folha para impressao usando lucide Printer/FileText. Modal acessivel (dialog,
nome, fechar, Escape, foco inicial e restaurado; impedir foco atras com dialog
nativo ou controle equivalente), branco, legivel no mobile e desktop.
Mostrar resultado.insertBloco exatamente como fornecido pelo motor (texto
seguro, sem HTML injetado), versaoParametros e data/hora do calculo apresentado.
Pode exibir campos maternos/IG/medidas ja existentes sem recalcular nada. Nao
inventar nome de paciente, CPF, assinatura medica ou dados identificadores.
Usar folha A4 profissional, titulo compacto, tipografia legivel. Sem hero/cards
decorativos. Nao abrir dialogo de impressora automaticamente: usuario clica
Imprimir dentro da previa e chama window.print de forma sincrona no clique.

CSS de impressao deve imprimir SOMENTE a folha, sem formulario, sidebar ou
outros elementos do app. Preferir portal fora do root quando necessario e
CSS @media print escopado somente enquanto modal aberto. Nao deixar regras
globais de print alteradas depois de fechar. No cancelamento de impressao,
modal continua utilizavel, sem perder dados. Fechar/remover listener na limpeza.
Quando dados mudarem/invalido, nao permitir folha antiga ou imprimir resultado
stale; evitar snapshot de insertedBlock. Nao alterar insercao/atualizacao/remocao
do bloco clinico existente. Nao adicionar pacotes nem enviar para backend/sala
auxiliar nesta etapa; apenas previsualizar e imprimir localmente.

Ferramentas Read/Grep/Glob/Edit/Write disponiveis, sem shell. Nao declarar testes
executados. Edite somente ownership; coordenador roda types/build/browser/PDF.
Nao editar docs/env/config nem outros componentes, nao criar subagentes.
Ao terminar responder PRONTO com arquivos, resumo, acessibilidade e riscos.
