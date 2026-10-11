/**
 * Os JSON Schemas de extração foram escritos para o Structured Outputs strict da
 * OpenAI. A Anthropic aceita o mesmo dialeto com duas diferenças que importam:
 *
 *  1. Palavras-chave de restrição (minimum, maxLength, maxItems…) dão 400.
 *  2. Limites de complexidade POR REQUISIÇÃO no modo estrito
 *     (`output_config.format`): no máximo 16 parâmetros com união
 *     (`anyOf` ou `type: ["x","null"]`) e 24 opcionais. Quase todo extrator
 *     clínico passa disso — cada campo anulável é uma união.
 *
 * Por isso a decisão é por schema: cabe nos limites → saída estrita
 * (`output_config.format`, JSON garantido); não cabe → ferramenta NÃO estrita
 * com o schema original como `input_schema` (sem compilação de gramática nem
 * limites), e quem chama valida com o Zod do extrator, como já fazia.
 * O contrato de extração não muda em nenhum dos dois caminhos.
 */

export const ANTHROPIC_STRICT_LIMITS = { unionParams: 16, optionalParams: 24 } as const;

const SUPPORTED_STRING_FORMATS = new Set([
  "date-time",
  "time",
  "date",
  "duration",
  "email",
  "hostname",
  "uri",
  "ipv4",
  "ipv6",
  "uuid",
]);

/** Restrições que a API rejeita no modo estrito; o Zod de quem chama continua valendo. */
const UNSUPPORTED_KEYWORDS = [
  "minimum",
  "maximum",
  "exclusiveMinimum",
  "exclusiveMaximum",
  "multipleOf",
  "minLength",
  "maxLength",
  "maxItems",
  "uniqueItems",
  "patternProperties",
  "minProperties",
  "maxProperties",
];

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function typesOf(node: Json): string[] {
  const t = node.type;
  if (Array.isArray(t)) return t.filter((x): x is string => typeof x === "string");
  return typeof t === "string" ? [t] : [];
}

/**
 * Cópia do schema aceitável pelo modo estrito da Anthropic: remove restrições não
 * suportadas, troca `oneOf` por `anyOf` e fecha todo objeto com
 * `additionalProperties: false`. Não mexe em tipos, enums nem `required`.
 */
export function toAnthropicStrictSchema(schema: Json): Json {
  const walk = (node: unknown): unknown => {
    if (Array.isArray(node)) return node.map(walk);
    if (!isObject(node)) return node;
    const out: Json = {};
    for (const [key, value] of Object.entries(node)) {
      if (UNSUPPORTED_KEYWORDS.includes(key)) continue;
      if (key === "minItems" && value !== 0 && value !== 1) continue;
      if (key === "format" && (typeof value !== "string" || !SUPPORTED_STRING_FORMATS.has(value))) continue;
      if (key === "properties" && isObject(value)) {
        out.properties = Object.fromEntries(Object.entries(value).map(([k, v]) => [k, walk(v)]));
        continue;
      }
      if (key === "oneOf") {
        out.anyOf = walk(value);
        continue;
      }
      if (key === "additionalProperties") continue;
      out[key] = walk(value);
    }
    if (typesOf(node).includes("object") || isObject(node.properties)) out.additionalProperties = false;
    return out;
  };
  return walk(schema) as Json;
}

/** Conta uniões e opcionais como a API conta (soma de todos os níveis do schema). */
export function strictSchemaComplexity(schema: Json): { unionParams: number; optionalParams: number } {
  let unionParams = 0;
  let optionalParams = 0;
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!isObject(node)) return;
    if (Array.isArray(node.anyOf) || Array.isArray(node.oneOf) || typesOf(node).length > 1) unionParams += 1;
    if (isObject(node.properties)) {
      const required = new Set(Array.isArray(node.required) ? node.required : []);
      for (const key of Object.keys(node.properties)) if (!required.has(key)) optionalParams += 1;
    }
    for (const [key, value] of Object.entries(node)) {
      if (key === "properties" && isObject(value)) Object.values(value).forEach(walk);
      else if (key !== "enum" && key !== "const" && key !== "required") walk(value);
    }
  };
  walk(schema);
  return { unionParams, optionalParams };
}

export function fitsAnthropicStrictLimits(schema: Json): boolean {
  const c = strictSchemaComplexity(schema);
  return (
    c.unionParams <= ANTHROPIC_STRICT_LIMITS.unionParams &&
    c.optionalParams <= ANTHROPIC_STRICT_LIMITS.optionalParams
  );
}

/** Nome de ferramenta aceito pela API (^[a-zA-Z0-9_-]{1,64}$). */
export function toolNameFor(schemaName: string): string {
  const name = schemaName.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return name || "structured_output";
}

function allowsNull(node: unknown): boolean {
  if (!isObject(node)) return false;
  if (typesOf(node).includes("null")) return true;
  const variants = Array.isArray(node.anyOf) ? node.anyOf : Array.isArray(node.oneOf) ? node.oneOf : [];
  return variants.some(allowsNull);
}

/**
 * Campo obrigatório e anulável que o modelo OMITIU vira `null` — no contrato de
 * extração, ausência e `null` dizem a mesma coisa ("não informado"). Só existe
 * para o caminho por ferramenta não estrita, onde o schema não é imposto na
 * geração. Nunca inventa valor: só completa com `null` onde `null` é permitido.
 */
export function fillOmittedNullables(value: unknown, schema: unknown): unknown {
  if (!isObject(schema)) return value;
  if (Array.isArray(value)) {
    return isObject(schema.items) ? value.map((v) => fillOmittedNullables(v, schema.items)) : value;
  }
  if (!isObject(value)) return value;
  const variants = Array.isArray(schema.anyOf) ? schema.anyOf : Array.isArray(schema.oneOf) ? schema.oneOf : null;
  if (variants) {
    const objectVariant = variants.find((v) => isObject(v) && isObject(v.properties));
    return objectVariant ? fillOmittedNullables(value, objectVariant) : value;
  }
  if (!isObject(schema.properties)) return value;
  const out: Json = { ...value };
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  for (const [key, propSchema] of Object.entries(schema.properties)) {
    if (key in out) out[key] = fillOmittedNullables(out[key], propSchema);
    else if (required.has(key) && allowsNull(propSchema)) out[key] = null;
  }
  return out;
}

/**
 * W16 (experimento de omitir nulos): o mesmo schema sem os anuláveis em
 * `required`, para o modelo poder omiti-los na chamada da ferramenta. A
 * validação continua sendo o schema ORIGINAL depois de `fillOmittedNullables`.
 */
export function relaxNullableRequired(schema: unknown): unknown {
  if (Array.isArray(schema)) return schema.map(relaxNullableRequired);
  if (!isObject(schema)) return schema;
  const out: Json = {};
  for (const [k, v] of Object.entries(schema)) {
    if (k === "properties" && isObject(v)) {
      out[k] = Object.fromEntries(Object.entries(v).map(([p, ps]) => [p, relaxNullableRequired(ps)]));
    } else if (k === "items" || k === "anyOf" || k === "oneOf") {
      out[k] = relaxNullableRequired(v);
    } else {
      out[k] = v;
    }
  }
  if (Array.isArray(schema.required) && isObject(schema.properties)) {
    const props = schema.properties;
    out.required = schema.required.filter((key) => !(typeof key === "string" && allowsNull(props[key])));
  }
  return out;
}
