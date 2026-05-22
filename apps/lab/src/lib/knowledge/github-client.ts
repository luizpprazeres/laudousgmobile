import "server-only";

const GH_API = "https://api.github.com";

type Env = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
};

function readEnv(): Env | null {
  const token = process.env.GITHUB_TOKEN;
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH ?? "main";
  if (!token || !owner || !repo) return null;
  return { token, owner, repo, branch };
}

export function isGitHubConfigured(): boolean {
  return readEnv() !== null;
}

function authHeaders(env: Env) {
  return {
    Authorization: `Bearer ${env.token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function getCurrentSha(env: Env, repoPath: string): Promise<string | null> {
  const url = `${GH_API}/repos/${env.owner}/${env.repo}/contents/${encodeURIComponent(repoPath).replace(/%2F/g, "/")}?ref=${env.branch}`;
  const res = await fetch(url, { headers: authHeaders(env), cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET sha ${res.status}: ${await res.text().then((t) => t.slice(0, 200))}`);
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

export type CommitResult = {
  commitSha: string;
  commitUrl: string;
  htmlUrl: string;
};

/**
 * Cria ou atualiza arquivo no GitHub via Contents API.
 * Faz commit direto no branch configurado (default: main).
 */
export async function commitFile(args: {
  repoPath: string;
  content: string;
  message: string;
}): Promise<CommitResult> {
  const env = readEnv();
  if (!env) throw new Error("github_not_configured");

  const sha = await getCurrentSha(env, args.repoPath);
  const url = `${GH_API}/repos/${env.owner}/${env.repo}/contents/${encodeURIComponent(args.repoPath).replace(/%2F/g, "/")}`;
  const contentBase64 = Buffer.from(args.content, "utf-8").toString("base64");

  const body: Record<string, unknown> = {
    message: args.message,
    content: contentBase64,
    branch: env.branch,
    committer: {
      name: "LaudoUSG Lab",
      email: "lab+bot@laudousg.com",
    },
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: { ...authHeaders(env), "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (res.status === 409) {
    throw new Error("conflict: arquivo mudou no repo desde a leitura. Recarregue e tente de novo.");
  }
  if (!res.ok) {
    const detail = await res.text().then((t) => t.slice(0, 300));
    throw new Error(`GitHub PUT ${res.status}: ${detail}`);
  }

  const data = (await res.json()) as {
    commit?: { sha?: string; html_url?: string };
    content?: { html_url?: string };
  };
  return {
    commitSha: data.commit?.sha ?? "",
    commitUrl: data.commit?.html_url ?? "",
    htmlUrl: data.content?.html_url ?? "",
  };
}

export function repoSettings(): { owner: string; repo: string; branch: string } | null {
  const env = readEnv();
  if (!env) return null;
  return { owner: env.owner, repo: env.repo, branch: env.branch };
}
