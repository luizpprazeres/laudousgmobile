import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
export type Surface = "web" | "ios" | "watch" | "unknown";
export type UsageContext = {
  userId?: string;
  route: string;
  surface: Surface;
  requestId: string;
};
const storage = new AsyncLocalStorage<UsageContext>();
export function inferSurface(req: Request): Surface {
  const explicit = req.headers.get("x-laudousg-surface");
  if (explicit === "web" || explicit === "ios" || explicit === "watch")
    return explicit;
  const ua = req.headers.get("user-agent") ?? "";
  if (/LaudoUSG\//i.test(ua) && /CFNetwork\//i.test(ua) && /Darwin\//i.test(ua))
    return "ios";
  if (/Mozilla\//i.test(ua)) return "web";
  return "unknown";
}
export function usageContext() {
  return storage.getStore();
}
export function setUsageUser(userId: string) {
  const ctx = storage.getStore();
  if (ctx) ctx.userId = userId;
}
export function withUsageRequest<T>(
  req: Request,
  route: string,
  run: () => T,
): T {
  return storage.run(
    { route, surface: inferSurface(req), requestId: randomUUID() },
    run,
  );
}
