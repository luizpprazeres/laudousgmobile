/**
 * As 27 unidades federativas, para popular o seletor.
 *
 * É uma segunda cópia da lista que vive em `@laudousg/shared`, e de propósito:
 * o `apps/web` não depende de nenhum pacote do workspace, e criar essa
 * dependência mudaria a forma do deploy por causa de 27 siglas que não mudam
 * desde 1988.
 *
 * A duplicação é segura porque **a autoridade é o servidor**: `/api/me/profile`
 * valida contra `UfSchema` e recusa o que não estiver lá. Se um dia as listas
 * divergirem, o efeito é o seletor oferecer algo que a gravação rejeita — falha
 * visível, não dado errado no laudo.
 */
export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
] as const

export type Uf = (typeof UFS)[number]
