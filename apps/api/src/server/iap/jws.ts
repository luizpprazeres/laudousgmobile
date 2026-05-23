export function decodeJws<T>(jws: string): T {
  const parts = jws.split(".");
  if (parts.length !== 3) throw new Error("invalid jws");
  const payload = parts[1];
  if (!payload) throw new Error("invalid jws");
  const json = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(json) as T;
}
