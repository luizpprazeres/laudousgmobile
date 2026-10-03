# Cruzamento Laudário × LaudoUSG — Doppler de Fístula Arteriovenosa

Data: 03/10/2026. O concorrente foi observado com três cenários sintéticos e restaurado ao final. O LaudoUSG foi avaliado pela categoria, navegação dos clientes, normalização da API e presença de contratos e conteúdo clínico versionado.

## Síntese

O LaudoUSG expõe `DOPPLER_FISTULA_AV` no Web, Android/RN e iOS. Na Web, a categoria segue pelo writer. Não foi encontrado contrato em `packages/shared/src/clinicalModels`, formulário clínico próprio, renderer determinístico ou diretório `packages/knowledge/snippets/DOPPLER_FISTULA_AV` no checkout atual.

Há referências históricas a blocos existentes no banco, mas esta rodada não consultou a produção. Portanto, não se afirma que o RAG remoto esteja vazio. O que está comprovadamente ausente é uma fonte clínica versionada no repositório e um contrato estruturado comum aos clientes.

| Domínio | Laudário observado | LaudoUSG atual |
| --- | --- | --- |
| Tipo de acesso | Membro, radiocefálica e anatomia da anastomose | Texto livre pelo writer |
| Artéria doadora | Calibre, paredes e padrão de baixa resistência | Sem campos tipados |
| Anastomose | Perviedade, parede, sinais diretos, região juxta, VPS, razão e diâmetro | Sem campos tipados ou cálculos determinísticos |
| Veia de drenagem | Perviedade, trombo, arterialização, trajeto e extensão útil | Sem campos tipados |
| Volume de fluxo | Local, valor atual, anterior, variação e classificação | Sem calculadora integrada ao exame |
| Artéria distal | Perviedade, direção e roubo | Sem bloco estruturado |
| Punção | Profundidade, diâmetro e extensão útil no inventário | Sem bloco estruturado |

## Lacunas confirmadas

**Gap confirmado — contrato do acesso:** faltam lado, tipo e configuração anatômica, artéria doadora, anastomose, veia de drenagem, artéria distal e segmento utilizável para punção como dados estruturados.

**Gap confirmado — hemodinâmica determinística:** não há estrutura para volume atual, local de medição, exame anterior, variação percentual, VPS na anastomose, velocidades de referência, razão e diâmetro luminal mínimo. Hoje esses fatos podem chegar ao texto, mas não são recalculáveis nem auditáveis pelo cliente.

**Gap confirmado — estado derivado:** sem contrato, o LaudoUSG não consegue garantir que apagar ou desativar uma fonte remova as conclusões dependentes. O defeito observado no concorrente deve virar um teste explícito do nosso modelo.

**Gap confirmado — fonte versionada:** o checkout não contém snippets para `DOPPLER_FISTULA_AV`. A categoria pode receber conhecimento remoto, mas a base que sustenta a geração não está revisável junto com o código nesta fotografia.

## Regras de segurança para o contrato v1

O estado inicial de repercussão cardíaca deve ser “não avaliada”. “Sem repercussão” só pode entrar quando o médico confirmar a avaliação correspondente. O sistema pode sinalizar alto fluxo a partir de uma regra aprovada, mas não deve converter sozinho o valor em diagnóstico clínico ou conduta.

Medidas quantitativas precisam guardar unidade, território e papel. Uma razão automática deve nascer de duas velocidades identificadas; razão digitada manualmente precisa permanecer marcada como manual. Percentual de variação exige exame anterior identificado e comparação tecnicamente compatível.

Estenose deve separar sinais diretos, topografia, medidas e classificação. A conclusão só pode usar uma faixa quando a regra versionada estiver satisfeita e o médico confirmar. Oclusão, trombose, roubo, pseudoaneurisma, coleção e alterações de punção devem ser módulos independentes para evitar cascatas contraditórias.

## Proposta para aprovação clínica

Antes de implementar, o contrato v1 deve apresentar em HTML exemplos normal, baixo fluxo, alto fluxo, estenose juxta-anastomótica e trombose. A decisão médica precisa fechar:

1. segmentos e tipos de fístula obrigatórios;
2. local preferencial do volume de fluxo e requisitos de técnica;
3. limiares e fontes para maturação, baixo e alto fluxo;
4. critérios para estenose por razão, velocidade e diâmetro;
5. regras de comparação longitudinal;
6. definição de roubo e necessidade de correlação clínica;
7. dados mínimos do trajeto útil para punção;
8. quando sugerir avaliação vascular sem prescrever conduta.

Após aprovação, o contrato compartilhado deve alimentar Web e Android/RN, com implementação equivalente no iOS e testes que removam atomicamente toda interpretação quando a fonte for apagada. O gate deve permanecer desligado até os casos sintéticos e a paridade estarem fechados.

O próximo cruzamento prioritário será Doppler renal, pois o LaudoUSG já possui writer e auditoria específicos e permite comparar qualidade clínica além da simples variedade de campos.
