import { z } from "zod";

const ImageUrlSchema = z.object({
  url: z.string().regex(/^data:image\/(png|jpeg|jpg|webp);base64,/),
});

const TextPartSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
});

const ImagePartSchema = z.object({
  type: z.literal("image_url"),
  image_url: ImageUrlSchema,
});

const ContentPartSchema = z.discriminatedUnion("type", [
  TextPartSchema,
  ImagePartSchema,
]);

const ConsultantMessageSchema = z
  .object({
    role: z.enum(["user", "assistant"]),
    content: z.union([z.string(), z.array(ContentPartSchema).min(1)]),
  })
  .refine(
    (message) =>
      typeof message.content === "string" ||
      message.content.filter((part) => part.type === "image_url").length <= 5,
    { message: "Máximo de 5 imagens por mensagem." },
  );

export const ConsultantRequestBodySchema = z.object({
  messages: z.array(ConsultantMessageSchema).min(1).max(50),
  category: z.string().regex(/^[A-Z_]+$/).max(50).optional(),
  reportId: z.string().uuid().optional(),
});

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

export type ConsultantMessage = {
  role: "user" | "assistant";
  content: string | ContentPart[];
};

export type ConsultantSSEEvent =
  | { type: "content"; text: string; ts: string }
  | { type: "done"; ts: string }
  | { type: "error"; message: string; ts: string };
