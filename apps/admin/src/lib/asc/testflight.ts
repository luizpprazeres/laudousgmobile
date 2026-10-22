/**
 * TestFlight ao vivo (chave App Manager, só GET). Nomes viram iniciais; e-mail nunca sai daqui.
 */
import { ascGet, type CredenciaisAsc } from "./cliente";
import type { TestflightDados } from "../data/tipos";

export function iniciais(primeiro?: string | null, ultimo?: string | null): string {
  const a = (primeiro ?? "").trim()[0] ?? "";
  const b = (ultimo ?? "").trim()[0] ?? "";
  return (a + b).toUpperCase() || "—";
}

type Somavel = Record<string, number>;
function somarPontos(dados: any[] | undefined): Somavel {
  const acc: Somavel = {};
  for (const d of dados ?? []) {
    for (const p of d.dataPoints ?? []) {
      for (const [k, v] of Object.entries(p.values ?? {})) acc[k] = (acc[k] ?? 0) + (Number(v) || 0);
    }
  }
  return acc;
}

export async function lerTestflight(c: CredenciaisAsc, appId: string): Promise<TestflightDados> {
  const chamadas: { path: string; status: number }[] = [];
  const get = async (caminho: string, rotulo: string) => {
    const r = await ascGet(c, caminho);
    chamadas.push({ path: rotulo, status: r.status });
    return r.status < 300 ? r.json : null;
  };

  const [app, grupos, testers, uso30, uso7, versoes, builds, crash, shots] = await Promise.all([
    get(`/v1/apps/${appId}?fields[apps]=name,bundleId`, "/v1/apps/{id}"),
    get(`/v1/apps/${appId}/betaGroups?fields[betaGroups]=name,isInternalGroup,publicLinkEnabled,createdDate&limit=50`, "/v1/apps/{id}/betaGroups"),
    get(`/v1/betaTesters?filter[apps]=${appId}&fields[betaTesters]=firstName,lastName,inviteType,state,betaGroups&include=betaGroups&limit=200`, "/v1/betaTesters"),
    get(`/v1/apps/${appId}/metrics/betaTesterUsages?groupBy=betaTesters&period=P30D`, "/v1/apps/{id}/metrics/betaTesterUsages?P30D"),
    get(`/v1/apps/${appId}/metrics/betaTesterUsages?groupBy=betaTesters&period=P7D`, "/v1/apps/{id}/metrics/betaTesterUsages?P7D"),
    get(`/v1/apps/${appId}/appStoreVersions?limit=3&fields[appStoreVersions]=versionString,appStoreState,createdDate`, "/v1/apps/{id}/appStoreVersions"),
    get(
      `/v1/builds?filter[app]=${appId}&sort=-uploadedDate&limit=8&include=preReleaseVersion&fields[builds]=version,uploadedDate,processingState,expired,preReleaseVersion&fields[preReleaseVersions]=version`,
      "/v1/builds",
    ),
    get(`/v1/apps/${appId}/betaFeedbackCrashSubmissions?limit=50`, "/v1/apps/{id}/betaFeedbackCrashSubmissions"),
    get(`/v1/apps/${appId}/betaFeedbackScreenshotSubmissions?limit=50`, "/v1/apps/{id}/betaFeedbackScreenshotSubmissions"),
  ]);
  if (!app) throw new Error("App Store Connect não respondeu ao /v1/apps (chave ou permissão).");

  const listaGrupos = ((grupos?.data ?? []) as any[]).map((g) => ({
    id: String(g.id),
    nome: String(g.attributes?.name ?? "?"),
    interno: !!g.attributes?.isInternalGroup,
    link_publico: !!g.attributes?.publicLinkEnabled,
    criado: String(g.attributes?.createdDate ?? ""),
  }));
  const usoPorTester = new Map<string, Somavel>();
  for (const row of (uso30?.data ?? []) as any[]) {
    const id = row.dimensions?.betaTesters?.data?.id;
    if (id) usoPorTester.set(String(id), somarPontos([row]));
  }
  const listaTesters = ((testers?.data ?? []) as any[]).map((t) => {
    const u = usoPorTester.get(String(t.id)) ?? {};
    return {
      iniciais: iniciais(t.attributes?.firstName, t.attributes?.lastName),
      convite: t.attributes?.inviteType ?? null,
      estado: t.attributes?.state ?? null,
      grupos: ((t.relationships?.betaGroups?.data ?? []) as any[]).map((g) => listaGrupos.find((x) => x.id === String(g.id))?.nome ?? "?"),
      sessoes_30d: u.sessionCount ?? 0,
      crashes_30d: u.crashCount ?? 0,
      feedbacks_30d: u.feedbackCount ?? 0,
    };
  });

  const prv = new Map<string, string>(
    ((builds?.included ?? []) as any[]).filter((i) => i.type === "preReleaseVersions").map((i) => [String(i.id), String(i.attributes?.version)]),
  );
  const listaBuilds = await Promise.all(
    ((builds?.data ?? []) as any[]).map(async (b) => {
      const m = await get(`/v1/builds/${b.id}/metrics/betaBuildUsages`, "/v1/builds/{id}/metrics/betaBuildUsages");
      const s = somarPontos(m?.data);
      return {
        build: String(b.attributes?.version ?? "?"),
        versao: prv.get(String(b.relationships?.preReleaseVersion?.data?.id)) ?? null,
        enviado: String(b.attributes?.uploadedDate ?? ""),
        estado: String(b.attributes?.processingState ?? "?"),
        expirado: !!b.attributes?.expired,
        instalacoes: s.installCount ?? 0,
        sessoes: s.sessionCount ?? 0,
        crashes: s.crashCount ?? 0,
      };
    }),
  );

  const t30 = somarPontos(uso30?.data);
  const t7 = somarPontos(uso7?.data);
  return {
    app: { id: String(app.data?.id ?? appId), name: String(app.data?.attributes?.name ?? "") },
    versoes_loja: ((versoes?.data ?? []) as any[]).map((v) => ({
      versao: String(v.attributes?.versionString ?? "?"),
      estado: String(v.attributes?.appStoreState ?? "?"),
      criada: String(v.attributes?.createdDate ?? ""),
    })),
    grupos: listaGrupos.map(({ id: _id, ...g }) => ({ ...g, testadores: listaTesters.filter((t) => t.grupos.includes(g.nome)).length })),
    testadores: listaTesters,
    uso: { d30: { sessoes: t30.sessionCount ?? 0, crashes: t30.crashCount ?? 0 }, d7: { sessoes: t7.sessionCount ?? 0, crashes: t7.crashCount ?? 0 } },
    builds: listaBuilds,
    feedback: { crash: crash ? (crash.data ?? []).length : null, screenshot: shots ? (shots.data ?? []).length : null },
    chamadas,
    coletado_em: new Date().toISOString(),
  };
}
