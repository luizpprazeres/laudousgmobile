# Pipeline do estudo do Laudário à implementação no LaudoUSG

## Finalidade

O estudo do Laudário é uma etapa de descoberta de cobertura clínica. Seu resultado precisa virar conteúdo aplicável no LaudoUSG, tanto nos aplicativos móveis quanto no Web. Não basta registrar o que o concorrente oferece ou apontar lacunas.

## Fluxo obrigatório

### 1. Observação do concorrente — Claude Code

Estudar um exame e no máximo três cenários sintéticos. Registrar controles, estados automáticos, medidas, classificações, corpo do laudo, conclusão e inconsistências. Não copiar o texto integral e não usar dados de pacientes.

### 2. Cruzamento com o LaudoUSG — Claude Code

Confirmar o estado real no Web, Android/RN, iOS, API, banco e contratos compartilhados. Classificar a categoria como ausente, genérica, parcial, estruturada dormente ou estruturada ativa. Identificar o que pode ser incrementado quando a categoria já existe.

O cruzamento deve transformar cada lacuna relevante em uma sugestão objetiva de melhoria, separando controle clínico, efeito no corpo, efeito na conclusão, validações, uso no formulário Web e uso nos prompts mobile. A sugestão deve trazer prioridade, evidência e pendências para revisão médica. O agente comunica ao orquestrador os achados que possam melhorar estudos paralelos ou categorias relacionadas.

### 3. Síntese clínica — GPT 6.1 Sol High

Receber apenas estudos revisados e produzir um pacote original no estilo Domingos com:

1. nome e código canônico da categoria;
2. modelo basal de exame normal;
3. estruturas e campos do formulário;
4. estados `não avaliado`, `normal`, `alterado` e `limitado` quando aplicáveis;
5. frases de cada alteração para o corpo em `OS SEGUINTES ASPECTOS FORAM OBSERVADOS`;
6. frases correspondentes para `CONCLUSÃO` ou `IMPRESSÃO`;
7. medidas, unidades, lateralidade, cálculos e dependências;
8. dados mínimos necessários antes de publicar diagnósticos, classificações ou recomendações;
9. roteiro clínico e exemplos para o prompt mobile;
10. opções selecionáveis e regras de composição para o formulário Web;
11. casos sintéticos normais, alterados, incompletos, contraditórios e de remoção de achado.

O conteúdo do concorrente serve para descobrir cobertura. A redação deve ser nova. Quando a evidência acumulada não sustentar uma frase ou regra, o pacote registra a pendência em vez de completar por suposição.

### 4. Revisão médica

Gerar uma prévia em HTML com o modelo normal, cada alteração e sua conclusão lado a lado. O pacote permanece dormente até aprovação do Luiz. Alterações clínicas posteriores voltam para essa revisão.

### 5. Implementação compartilhada

Criar um contrato versionado em `packages/shared` e ligar duas entradas ao mesmo estado clínico:

- mobile: ditado interpretado pelo prompt e exemplos da categoria;
- Web: seleção manual no formulário estruturado.

O renderer e a biblioteca de frases devem consumir o mesmo contrato. Texto, conclusão, cálculo, esquema visual e Sala do Auxiliar não podem depender de fontes clínicas paralelas.

## Regra de paridade

Uma categoria não é considerada implementada só porque aparece no seletor ou gera texto livre. O objetivo final é ter conteúdo clínico completo para o prompt mobile e opções estruturadas no Web. A ativação pública deve preservar paridade de contrato entre Web, Android/RN e iOS, mesmo quando a interface de entrada for diferente.

## Lotes de trabalho

Cada lote de síntese deve ser pequeno o bastante para revisão clínica. O padrão é uma categoria complexa ou até três categorias simples relacionadas. O lote informa as fontes usadas, as lacunas restantes, os arquivos de destino e os testes necessários. Nenhum lote faz commit de ativação clínica antes da aprovação.
