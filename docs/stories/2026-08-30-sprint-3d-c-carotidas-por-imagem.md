# Sprint 3D-C — Doppler de carótidas e vertebrais por imagem

## Status

Em andamento.

## Objetivo

Entregar a categoria bilateral `DOPPLER_CAROTIDAS` na web e permitir que o celular
extraia de imagens as medidas exibidas pelo aparelho, sempre com revisão explícita
antes de preencher o laudo aberto no computador.

## Diagnóstico inicial

A categoria existe hoje apenas no cadastro, na normalização do nome e nas telas de
analytics. Não há renderer, catálogo clássico/objetivo, formulário web, contrato de
visão ou aplicação Companion para carótidas. Documentos antigos afirmavam que havia
snippets em curadoria, mas esses arquivos não existem no checkout atual.

Por isso a câmera não será ligada antes de existir um destino estruturado e testado
para cada medida.

## Ordem de execução

### 3D-C1 — Categoria funcional sem imagem

- Criar estado bilateral para carótidas comum, interna e externa.
- Registrar VPS e VDF; calcular IR apenas quando ambas as velocidades forem válidas.
- Registrar espessura médio-intimal e placas separadamente por lado.
- Registrar direção do fluxo das vertebrais por lado.
- Criar modelos clássico e objetivo e formulário web.
- Omitir medidas ausentes; nunca imprimir `____`.

### 3D-C2 — Imagens no celular

- Aceitar até três imagens no Android e no iOS.
- Extrair apenas texto/medidas visíveis e o vaso/lado identificável.
- Preservar cada medida com sua imagem de origem.
- Mesclar imagens sem sobrescrever uma medida diferente.
- Enviar os dados estruturados pelo Companion para revisão na web.

### 3D-C3 — Publicação

- Aplicar os dados revisados ao formulário aberto.
- Validar modelos clássico e objetivo com casos normais, placa e estenose descrita.
- Executar typechecks, testes, builds web/API/iOS e teste com imagens reais.
- Publicar web e nova build TestFlight.

## Regras clínicas e de segurança

- O exame é sempre bilateral e inclui vertebrais no mesmo laudo.
- O título clássico é `ULTRASSONOGRAFIA DOPPLER DE CARÓTIDAS E VERTEBRAIS`.
- A IA de visão não atribui grau de estenose, não recomenda conduta e não conclui
  normalidade.
- Uma placa não recebe composição, superfície ou percentual que não estejam visíveis
  ou explicitamente informados.
- Percentual NASCET e classificação hemodinâmica não serão inferidos de uma imagem
  isolada.
- Critérios automáticos de estenose só poderão ser ativados depois de uma tabela
  clínica versionada e validada pelo Luiz; até lá, o sistema preserva medidas e a
  classificação explicitamente selecionada pelo médico.
- Todo preenchimento vindo do celular exige revisão antes de alterar o laudo.

## Critérios de aceite

- [ ] A categoria abre na web com formulário bilateral completo.
- [ ] Os dois estilos produzem laudos coerentes e sem placeholders vazios.
- [ ] Mais de uma placa pode ser registrada no mesmo lado.
- [ ] Android e iOS extraem e revisam medidas de até três imagens.
- [ ] A web aplica apenas campos confirmados pelo usuário.
- [ ] Dados conflitantes são sinalizados, não sobrescritos silenciosamente.
- [ ] Teste com imagens reais documenta acertos, lacunas e conflitos.
- [ ] Produção web e TestFlight publicados.

## File list

- A preencher durante a implementação.
