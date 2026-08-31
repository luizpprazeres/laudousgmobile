import { parseAuthDeepLink } from "./deepLink";

function check(value: unknown, expected: unknown, label: string) {
  if (value !== expected) throw new Error(`${label}: ${String(value)} !== ${String(expected)}`);
}

const confirmation = parseAuthDeepLink(
  "laudousg://auth/callback#access_token=abc&refresh_token=def&type=signup",
);
check(confirmation?.accessToken, "abc", "token de confirmação");
check(confirmation?.refreshToken, "def", "refresh de confirmação");
check(confirmation?.type, "signup", "tipo de confirmação");

const recovery = parseAuthDeepLink(
  "laudousg://auth/reset-password?type=recovery#access_token=ghi&refresh_token=jkl",
);
check(recovery?.type, "recovery", "tipo de recuperação");
check(parseAuthDeepLink("https://laudousg.com.br/login"), null, "recusa link web");
check(parseAuthDeepLink("laudousg://auth/callback#error=expired"), null, "recusa sem tokens");

console.log("deepLink.manual: 6/6 verificações passaram");
