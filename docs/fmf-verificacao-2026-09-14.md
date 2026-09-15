# FMF: verificacao e proximos gates

## Confirmado

Em 14/09/2026 a interface do FMF instalado mostrou versao interna **1.0.44**.
O pacote macOS informa **1.0.3**: numeros de camadas diferentes, nao prova de
desatualizacao. Nao foi confirmada a ultima versao oficial disponivel.
Nao foram alterados pacientes. O controle por clique falhou com
noWindowsAvailable; leitura de tela funcionou. Comparacoes ficticias novas
ainda nao executadas.

O site oficial aponta para https://fmf.refractionx.com/download como download
do Fetal Medicine Software. A disponibilidade nao implica certificacao nem
autoriza apresentar um motor proprio como validado pela FMF.

Fontes primarias consultadas:

- https://archive.fetalmedicine.org/ (link de software confirmado no HTML publico)
- https://old.fetalmedicine.org/fmf-certification-2/nuchal-translucency-scan
- https://old.fetalmedicine.org/fmf-certification-2/preeclampsia-screening-1
- https://fetalmedicine.org/var/uploads/File/0/0/F/E/T/FETAL%20MEDICINE%20BOOKLET%202024.pdf

As paginas de certificacao descrevem mudancas de licenca em marco de 2026.
O folheto de 2024 ja descrevia software gratuito, trissomias, risco de PE em
diferentes janelas e graficos de crescimento/Doppler. Isso nao confirma que
a liberacao publica tenha ocorrido apenas ha um mes e meio nem que o software
atual use os mesmos coeficientes da implementacao local.

## Implementacoes encontradas

PE compartilhada: packages/shared/src/calculators/preEclampsiaFmf.ts.
Port iOS: LaudoUSG/Services/PreEclampsiaCalculator.swift no checkout Swift.
Versao matematica FMF/AJOG-2020+cal-2026-08-22; riscos PE <32/<34/<37 semanas.
342 casos golden (331 calculos e 11 recusas) sao referencias do proprio motor;
servem para paridade/regressao, nao equivalem a 342 validacoes independentes.
Documentacao registra ajustes empiricos PAM e apenas oito comparacoes manuais.

Trissomias: packages/shared/src/calculators/fmfTrisomy.ts, estado
validation-pending. Nao liberar como risco combinado validado somente por
passar testes internos. A implementacao antiga em laudousg/lib/calculators
deve ser comparada, nao assumida equivalente.

Doppler Barcelona: packages/shared/src/calculators/doppler.ts,
FMB-CALCULATOR-V2021. Portal atual em migracao; identificar fonte/versao
literalmente e nao chamar de curva FMF ou de ultima versao Barcelona.

## Sequencia segura

Criar paciente ficticia separada no FMF e registrar entradas completas,
versao e saidas exibidas. Comparar risco basal e ajustado com o motor local,
incluindo limites da janela, paridade, PE anterior, HAS, biomarcadores ausentes,
PAM e IP. Testar gemelares somente se o motor local suportar esse dominio.

Para trissomias, confirmar cada marcador e combinacao suportada com resultados
externos, antes de integrar iOS/Android. Para parto pre-termo, oftalmicas e
PIG/RCF, obter fontes/formulas e validar o desfecho exato: risco de PE nao
equivale automaticamente a risco de RCF.

A folha impressa deve trazer risco 1:N (e percentual equivalente), desfecho e
janela, basal/ajustado quando disponiveis, entradas e unidades, marcadores nao
usados, versao/fonte e limites. Grafico somente com curva identificada e dominio
valido; nunca derivar curva de exemplos visuais. Revisao medica antes de imprimir
e anexar. Envio a sala reutiliza o fluxo autenticado existente.

## Complemento focal: lacunas verificadas em 14/09/2026

Escopo desta rodada: somente este documento. Pesquisa publica por leitura de
paginas/HTML, sem login, upload, calculo remoto, UI, pacientes ou alteracao de
motor. A observacao da UI 1.0.44 acima e evidencia fornecida por Luiz/coordenador,
nao uma nova verificacao visual por este pesquisador. O erro noWindowsAvailable
nao foi retestado. O agente esta autorizado a operar a UI, criar casos sinteticos
e executar a comparacao manual quando a UI estiver disponivel. A interpretacao
e o aceite clinico ficam com Luiz.
Datas abaixo sao de consulta, nao datas de atualizacao dos modelos.

### 1. Desktop: disponibilidade estabelecida, ultima versao desconhecida

**Fato estabelecido em 14/09/2026:** a [home oficial FMF](https://archive.fetalmedicine.org/)
anuncia disponibilidade do software e liga diretamente ao
[download oficial](https://fmf.refractionx.com/download). A pagina de download
respondeu HTTP 200, mas seu HTML inicial exige JavaScript e nao revelou numero
de versao/release. Nao houve download de instalador nem inspecao de bundles.

**Desconhecido:** ultima versao publica por plataforma, data de publicacao,
changelog e correspondencia entre versao da interface, pacote desktop e motor.
Nao afirmar que 1.0.44 e a ultima, nem que 1.0.3 indica atraso. A disponibilidade
anunciada nao comprova instalacao bem-sucedida, ausencia de login ou todos os
recursos liberados. O folheto de 2024 citado acima e evidencia historica, nao
release note atual; sua reabertura nesta rodada nao foi bem-sucedida.

**Acao para fechar:** Luiz pode fornecer o numero/data apresentados no download
ou release notes oficiais, sem identificadores de pacientes. Se nao publicados,
pedir ao suporte FMF a versao vigente por plataforma e o identificador do motor
de calculo correspondente. Nao comparar numeros de camadas diferentes.

### 2. Certificado profissional, licenca e acesso publico sao distintos

**Fato estabelecido em 14/09/2026:** a [pagina oficial de certificacao TN](https://archive.fetalmedicine.org/fmf-certification-2/nuchal-translucency-scan)
vincula acesso ao software de rastreio ao certificado TN e requer certificados
dos marcadores adicionais quando usados. Tanto essa pagina quanto a
[certificacao PE](https://archive.fetalmedicine.org/fmf-certification-2/preeclampsia-screening-1)
informam, desde marco de 2026, registro no novo site para extensao de licencas
e emissao de novas licencas exclusivamente nele; orientam consultar a pagina
pessoal original para os arquivos compativeis. Ha ressalvas por pais.

**Desconhecido:** direitos exatos do novo desktop publico para cada modulo,
validade/escopo da licenca individual de Luiz e permissao para integrar ou
redistribuir o algoritmo no LaudoUSG. Nao extrapolar regras do antigo programa
FTS para o desktop novo, nem tratar gratuidade como certificacao do motor local.

**Acao para fechar:** obter termos/manuais vigentes e confirmacao escrita da
FMF sobre uso clinico, marcadores e integracao por terceiros. Basta evidencia
redigida do escopo/validade; nao enviar senha, token ou arquivo pessoal de licenca.

### 3. PE: 77..99 dias nao e a mesma janela que 11+0..13+6

**Fatos estabelecidos em 14/09/2026:** o codigo local
[PE_JANELA_DIAS](/Users/luizprazeres/laudousgmobile-def/packages/shared/src/calculators/preEclampsiaFmf.ts:390)
aceita 77..99 dias, isto e, 11+0..14+1. Seu cabecalho e o
[README](/Users/luizprazeres/laudousgmobile-def/packages/fmf/README.md:19)
ainda dizem 11+0..13+6 (77..97 dias).

A [documentacao oficial de rastreio PE, Tabela 1](https://archive.fetalmedicine.org/research/assess/preeclampsia/background)
descreve rastreio com fatores/biomarcadores em 11+0..14+1. A ferramenta oficial
[MoMs em lote](https://archive.fetalmedicine.org/research/mom) tambem apresenta
essa janela; apos timeouts do navegador de pesquisa, o HTML publico foi lido
via GET com HTTP 200, sem submeter arquivo. Ja o
[protocolo de medida de IP uterino na certificacao PE](https://archive.fetalmedicine.org/fmf-certification-2/preeclampsia-screening-1)
especifica 11+0..13+6.

**Conclusao limitada:** existe fundamento oficial para a janela de calculo
ate 99 dias; nao e correto chamar o limite local de erro matematico apenas
porque a tecnica de medida e o README dizem 13+6. Isso NAO valida a calibracao
local, todos os marcadores ou o comportamento do desktop 1.0.44 nos dias 98/99.
As paginas nao identificam o conjunto de parametros do executavel instalado.

**Acao para fechar:** obter o apendice integral e eventual atualizacao do
artigo Wright 2020 abaixo, e confirmacao FMF da janela por marcador. A comparacao
pode ser executada pelo agente quando a UI estiver disponivel, criando e
conferindo manualmente casos sinteticos de borda em 77, 97,
98 e 99 dias, com 76/100 como controles de recusa, registrando versao e quais
marcadores foram aceitos. A interpretacao e o aceite clinico ficam com Luiz.
Nao reduzir/ampliar dominio nem ajustar coeficientes
nesta rodada. A conciliacao documental definitiva fica pendente dessa decisao.

### 4. Oftalmicas e crescimento: separar marcador, desfecho e versao

**Endpoints oficiais estabelecidos em 14/09/2026:** leitura do HTML das paginas
abaixo confirmou os embeds, sem preencher ou executar as calculadoras.

| Finalidade publicada | Pagina oficial | Destino do embed |
| --- | --- | --- |
| Predicao de PE | [PE](https://archive.fetalmedicine.org/research/assess/preeclampsia) | [id=preeclampsia](https://fmf.refractionx.com/calculators?embed=true&bigpicture=true&id=preeclampsia) |
| Predicao de PIG/SGA | [SGA risk](https://archive.fetalmedicine.org/research/assess/sga-risk) | [id=sga](https://fmf.refractionx.com/calculators?embed=true&bigpicture=true&id=sga) |
| Manejo de PIG/SGA | [SGA management](https://archive.fetalmedicine.org/research/manage/sga) | [id=sga-management](https://fmf.refractionx.com/calculators?embed=true&bigpicture=true&id=sga-management) |

Esses sao enderecos de interface, nao contratos de API publica. O portal tambem
separa [avaliacao de crescimento](https://archive.fetalmedicine.org/research/assess/growth)
da predicao de risco. Nao foram identificados numero de versao do modelo,
changelog ou endpoint dedicado de oftalmicas na navegacao oficial examinada.
Nao inferir inexistencia do recurso nem inventar rota a partir do nome.

**Evidencia cientifica estabelecida:** o estudo de
[Gana et al., UOG 2022](https://pubmed.ncbi.nlm.nih.gov/35642909/) investiga
oftalmicas em 11-13 semanas para predicao de PE, inclusive combinacao com
marcadores estabelecidos. Isso nao identifica a formula da versao instalada.
O estudo de [Gana et al., JCM 2025](https://pubmed.ncbi.nlm.nih.gov/40648799/)
trata de oftalmicas e nascimento PIG: relata associacao do PSV ratio e pede
validacao adicional multicentrica. Nao demonstra sozinho um motor clinico de
RCF validado e versionado. Foram conferidos os registros/resumos; nao revisados
integralmente suplementos ou coeficientes desses artigos nesta rodada.

**Lacuna acionavel:** decidir primeiro entre risco de nascimento PIG, diagnostico
de RCF e manejo de feto ja pequeno, com percentil e idade gestacional do
desfecho explicitos. Solicitar manual/especificacao vigente do modulo e
vinculo com a publicacao. Oftalmica como marcador de PE nao autoriza converter
risco PE em risco RCF; disponibilizar uma tela nao comprova validacao do port.

### Material exato que Luiz pode fornecer

Prioridade PE: Wright D, Wright A, Nicolaides KH. *The competing risk approach
for prediction of preeclampsia*. AJOG 2020;223:12-23.e7.
[Registro e DOI](https://pubmed.ncbi.nlm.nih.gov/31733203/),
DOI 10.1016/j.ajog.2019.11.1247. Pedir PDF definitivo com apendice completo e
eventual errata/especificacao atual da FMF. O antigo PDF FMF 1247.pdf retornou
404 nesta rodada; nao reconstruir tabelas ausentes.

Prioridade oftalmicas: Gana N et al. *Ophthalmic artery Doppler at 11-13 weeks'
gestation in prediction of pre-eclampsia*. UOG 2022;59:731-736.
[Registro](https://pubmed.ncbi.nlm.nih.gov/35642909/), DOI 10.1002/uog.24914.
Pedir suplemento, protocolo de aquisicao/agregacao dos olhos e especificacao
de combinacao dos marcadores. Identificar separadamente qualquer modelo 2T/3T.

Prioridade PIG 1T: Papastefanou I et al. *Competing-risks model for prediction
of small-for-gestational-age neonate from biophysical and biochemical markers
at 11-13 weeks' gestation*. UOG 2021;57:52-61.
[Registro](https://pubmed.ncbi.nlm.nih.gov/33094535/), DOI 10.1002/uog.23523.
Pedir suplemento que define desfecho, dominio e validacao. O resumo informa
coorte em 11+0..13+6; nao importar automaticamente os 99 dias do modelo PE.

Complementar, nao substituto do modelo: Gana N et al. *Ophthalmic Artery Doppler
at 11-13 Weeks' Gestation and Birth of Small-for-Gestational-Age Neonates*.
J Clin Med 2025;14:4425. [Registro](https://pubmed.ncbi.nlm.nih.gov/40648799/),
DOI 10.3390/jcm14134425. Util para discutir a evidencia especifica de PIG,
nao para atribuir versao ao endpoint FMF. Consulta bibliografica: 14/09/2026.

Encerramento desta rodada: disponibilidade publica e enderecos oficiais
confirmados; ultima versao desktop, permissoes exatas de integracao, paridade
externa local e versoes dos modelos oftalmico/PIG continuam desconhecidas.
Sem implementacao clinica, novas comparacoes FMF ou alteracoes em outros arquivos.
