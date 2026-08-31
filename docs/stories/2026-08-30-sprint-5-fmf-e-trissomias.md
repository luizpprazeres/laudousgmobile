# Sprint 5 — FMF e trissomias do primeiro trimestre

## Status

Em andamento — auditoria inicial concluída.

## Objetivo

Concluir a frente FMF sem criar três calculadoras divergentes. Pré-eclâmpsia
permanece no núcleo compartilhado atual; trissomias T21, T18 e T13 deve nascer de
uma única fonte versionada, com validação numérica antes das telas web, Android e
iOS.

## Estado encontrado

### Pré-eclâmpsia

Está presente na web, Android e iOS. Web e Android consomem o núcleo TypeScript
compartilhado. O iOS possui port Swift protegido pelo mesmo conjunto de 342 casos
golden. A nova conferência manteve os oito pontos medidos manualmente no software
FMF e comparou 600 casos entre o motor de referência e o port TypeScript sem
divergências.

O teste isolado da integração web havia deixado de executar por causa da forma
como o runner `tsx` expõe módulos CommonJS. O cálculo não estava quebrado; o gate
foi ajustado para aceitar o carregamento do runner e voltou a passar 10/10, com o
typecheck web verde.

### Trissomias

Não existe no produto atual. O repositório iOS contém apenas o plano de 26/06. O
projeto web descontinuado contém um protótipo e parâmetros históricos, mas usa
outro produto e outro banco; ele será tratado somente como material de pesquisa,
nunca como implementação atual nem fonte automaticamente confiável.

O protótipo histórico ainda não prova paridade externa suficiente para liberar
risco clínico. Portanto, copiar a tela antiga ou portar diretamente o código para
Swift/Android está bloqueado até existir um núcleo canônico no repositório atual,
vetores golden e registro explícito da versão dos parâmetros.

## Sequência de implementação

- [x] Reconfirmar paridade e integração da pré-eclâmpsia atual.
- [x] Delimitar código atual, plano iOS e protótipo histórico descontinuado.
- [ ] Congelar contrato clínico da v1: idade materna, CCN, TN e marcadores ecográficos; bioquímica opcional como MoM já corrigido.
- [ ] Importar parâmetros por gerador reproduzível, com versão e hash.
- [ ] Criar núcleo compartilhado T21/T18/T13 e vetores golden.
- [ ] Fazer validação externa documentada e bloquear divergências próximas aos cortes.
- [ ] Integrar primeiro na web, depois Android e iOS usando os mesmos vetores.
- [ ] Inserir bloco coerente no laudo morfológico de primeiro trimestre.
- [ ] Criar PDF tabular; gráficos ficam para uma etapa posterior validada.

## Critério de segurança

Até a validação externa terminar, a interface não deve usar “certificado” ou
“endossado pela FMF”, nem apresentar o resultado como substituto de rastreio
diagnóstico. O cálculo precisa mostrar separadamente risco basal e corrigido,
marcadores usados e ausentes, truncamentos e versão do modelo.

## File list

- `apps/web/src/lib/calculators/preEclampsia.test.mts`
- `docs/stories/2026-08-30-sprint-5-fmf-e-trissomias.md`
