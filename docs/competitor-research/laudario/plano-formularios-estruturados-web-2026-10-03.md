# Plano de formulários estruturados no Web

Data: 03/10/2026.

## Diagnóstico atual

O seletor do Web mistura três níveis de maturidade sob a mesma aparência. As categorias tradicionais abrem formulários próprios por órgão. Cinco modelos novos possuem contrato compartilhado e formulário estruturado, mas continuam atrás de gates. Outras 14 categorias abrem o `WriterCategoryWorkspace`, cuja entrada é o campo livre de “Achados do exame”.

Por isso, Doppler renal e Doppler venoso de membros inferiores estão disponíveis, mas ainda não possuem a experiência selecionável que o Luiz espera. Isso não é uma diferença exclusiva do Web. Android/RN e iOS também oferecem essas duas categorias pelo fluxo genérico de achados e ditado. No Doppler venoso existe cartograma em quatro vistas, porém ele é produzido depois do texto e ainda não funciona como a fonte clínica única do laudo.

| Categoria | Web atual | Android/RN atual | iOS atual | Próximo passo |
| --- | --- | --- | --- | --- |
| Doppler renal | Genérico; writer dedicado dormente na API | Genérico | Genérico | Contrato renal compartilhado e formulário Web |
| Doppler venoso de MMII | Genérico; mapa parcial | Genérico; mapa parcial | Genérico; mapa parcial | Unificar formulário, texto e mapa em um contrato vascular |
| Doppler venoso de MMII com medidas | Genérico; não percorre todo o fluxo da categoria base | Genérico | Genérico | Usar o mesmo contrato da categoria base com escopo completo |
| Doppler arterial de MMII | Genérico | Genérico | Genérico | Contrato por vaso, medidas e derivados determinísticos |
| Doppler de fístula AV | Genérico | Genérico | Genérico | Contrato de acesso, anastomose, fluxo, estenose e trombose |
| Escrotal | Genérico | Genérico | Genérico | Contrato bilateral com Doppler e gates para torção |
| Parede abdominal | Genérico | Genérico | Genérico | Formulário por topografia e tipo de lesão/hérnia |
| Próstata transretal | Genérico | Genérico | Genérico | Formulário próprio, medidas e volume |
| Região inguinal | Genérico | Genérico | Genérico | Formulário bilateral e manobras dinâmicas |
| Paratireoide | Genérico | Genérico | Genérico | Formulário de lesão e localização |
| Glândulas salivares | Genérico | Genérico | Genérico | Formulário por glândula, lado e lesão |
| Transfontanelar | Genérico | Genérico | Genérico | Rodada funcional concluída; criar contrato neonatal após aprovação clínica das fontes |
| Ocular | Genérico | Genérico | Genérico | Estudar antes de definir contrato |
| Laudo livre | Genérico por definição | Genérico por definição | Genérico por definição | Manter livre |

## Esteira do estudo à aplicação

Cada exame estudado passa por cinco etapas. O Claude Code observa até três cenários sintéticos no Laudário, documenta controles e efeitos e cruza a cobertura com o LaudoUSG. Depois, um terminal com GPT 6.1 Sol High consolida todo o material revisado em um pacote clínico original: modelo normal, frases de alterações no corpo, conclusões correspondentes, contrato de campos, regras de dependência e casos de validação.

Esse pacote é a fonte comum da categoria. No mobile, ele abastece o prompt, o roteiro clínico e os exemplos usados para interpretar o ditado. No Web, ele abastece as opções selecionáveis e o renderer que monta o laudo. O estado preenchido precisa poder produzir o mesmo resultado clínico independentemente de ter vindo de seleção Web ou interpretação do ditado mobile.

Para categorias novas, o pacote cria o modelo basal e a biblioteca de alterações. Para categorias já existentes, o cruzamento identifica opções ausentes, frases desatualizadas, conclusões incompletas e regras que precisam ser incrementadas. Nada é ativado antes de uma prévia clínica legível e da aprovação do Luiz.

## Ordem de execução

A primeira onda será Doppler renal e Doppler venoso de membros inferiores, porque já há estudo funcional, writer, base clínica e componentes aproveitáveis. O formulário será criado primeiro no Web para validar a experiência, mas o contrato nascerá em `packages/shared`, evitando uma segunda regra clínica exclusiva do navegador.

No Doppler renal, o contrato deve separar aorta, artérias renais por lado e segmento, artérias intrarrenais, dimensões, artérias acessórias, qualidade e limitações. VPS, IR e relação aortorrenal devem preservar valor, unidade, lado e origem. Tardus-parvus será um achado, não um diagnóstico automático. O writer dedicado permanece desligado até os casos clínicos e a serialização das três plataformas passarem.

No Doppler venoso de MMII, o contrato deve registrar protocolo completo ou TVP, lado, estruturas avaliadas, compressibilidade, material intraluminal, fluxo, fasicidade, refluxo, extensão e fase confirmada. Texto e cartograma devem nascer desse mesmo contrato. A variante “com medidas” será uma apresentação mais detalhada do mesmo modelo, sem criar regras paralelas.

A segunda onda reunirá Doppler arterial de MMII, fístula AV e escrotal, que já foram estudados no Laudário. A terceira onda cobrirá parede abdominal, próstata transretal, região inguinal, paratireoide e glândulas salivares. A rodada funcional de Transfontanelar foi concluída e o contrato neonatal poderá entrar depois que as fontes e os critérios clínicos forem aprovados. Ocular será estudado antes de entrar na fila de contrato.

## Critério de pronto

Cada categoria só deixa o modo genérico quando possui contrato compartilhado versionado, formulário Web, validações clínicas, renderer determinístico, persistência do estado, retomada sem perda, casos sintéticos normais e alterados e prova de que nenhuma informação manual é sobrescrita. Depois da aprovação no Web, o mesmo contrato será ligado a Android/RN e iOS; a liberação pública continuará simultânea nas três plataformas.

O estudo do Laudário orienta a variedade de controles e os cenários que precisamos cobrir. A redação, as regras e o desenho final serão próprios do LaudoUSG, no estilo Domingos e com gates mais conservadores quando o concorrente inferir diagnóstico sem dados suficientes. A entrega só está completa quando o conteúdo aprovado estiver disponível tanto para o prompt mobile quanto para o formulário selecionável Web, com o mesmo contrato clínico por baixo.
