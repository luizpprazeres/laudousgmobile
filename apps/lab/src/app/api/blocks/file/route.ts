import { NextResponse } from "next/server";
import { readBlock, rootExists, writeBlock } from "@/lib/knowledge/fs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const relPath = url.searchParams.get("path");
  if (!relPath) return NextResponse.json({ error: "path obrigatório" }, { status: 400 });
  const block = readBlock(relPath);
  if (!block) return NextResponse.json({ error: "block não encontrado" }, { status: 404 });
  return NextResponse.json({ ...block, writable: rootExists().writable });
}

export async function PUT(req: Request) {
  let body: { path?: string; content?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "json inválido" }, { status: 400 });
  }
  if (!body.path || typeof body.content !== "string") {
    return NextResponse.json({ error: "path e content obrigatórios" }, { status: 400 });
  }
  const result = writeBlock(body.path, body.content);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}
