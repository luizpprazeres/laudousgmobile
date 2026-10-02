'use client'

import { CATEGORY_GROUPS } from '@/components/laudar/categoryGroups'
import {
  ACTIVE_EXAM_COUNT,
  activeExamName,
  isLandingExamAvailable,
  MUSCULOSKELETAL_REGIONS,
  UPCOMING_EXAMS,
} from '@/components/landing/v2/specialtyCatalog'

function groupLayout(id: string) {
  if (id === 'medicina_interna' || id === 'obstetricia' || id === 'saude_mulher') return 'xl:col-span-4'
  if (id === 'pequenas_partes') return 'xl:col-span-4'
  return 'xl:col-span-8'
}

export default function Specialties() {
  return (
    <section
      data-landing-section="especialidades"
      aria-labelledby="specialties-title"
      className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#eef3ef_0%,#f7faf7_13%,#f0f2ed_100%)] py-20 text-slate-950 sm:py-24 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-48 top-0 -z-10 h-[34rem] w-[48rem] rounded-full bg-[radial-gradient(closest-side,rgba(16,185,129,0.08),transparent)]"
      />
      <div className="mx-auto max-w-[1440px] px-5 sm:px-8 lg:px-12">
        <header className="grid gap-5 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-8">
            <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">
              Exames disponíveis
            </p>
            <h2
              id="specialties-title"
              className="max-w-[58rem] font-barlow text-[2.15rem] font-extrabold leading-[1.02] tracking-[-0.035em] text-slate-950 min-[360px]:text-[2.55rem] sm:text-[3.2rem] xl:text-[3.7rem]"
            >
              {ACTIVE_EXAM_COUNT} exames para acompanhar o seu raciocínio.
            </h2>
          </div>
          <p className="max-w-[31rem] text-[0.98rem] leading-relaxed text-slate-700 lg:col-span-4 lg:justify-self-end lg:pb-1">
            Modalidades específicas e regiões musculoesqueléticas em uma lista clara — sem misturar exames diferentes.
          </p>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-x-9 gap-y-9 sm:grid-cols-2 xl:mt-16 xl:grid-cols-12 xl:gap-x-10 xl:gap-y-12">
          {CATEGORY_GROUPS.map((group, index) => {
            const upcoming = UPCOMING_EXAMS[group.id] ?? []
            return (
              <section
                key={group.id}
                data-specialty-group={group.label}
                aria-labelledby={`specialty-group-${group.id}`}
                className={`min-w-0 border-t border-emerald-950/20 pt-4 ${groupLayout(group.id)}`}
              >
                <div className="flex items-baseline gap-3">
                  <span aria-hidden="true" className="font-mono text-[0.7rem] tabular-nums text-emerald-800/70">
                    0{index + 1}
                  </span>
                  <h3 id={`specialty-group-${group.id}`} className="font-barlow text-[1.2rem] font-bold leading-tight text-slate-950">
                    {group.label}
                  </h3>
                </div>

                <ul aria-label="Exames disponíveis" className="mt-4 grid grid-cols-1 gap-x-5 gap-y-2.5 min-[420px]:grid-cols-2 xl:grid-cols-2">
                  {group.categories.filter(isLandingExamAvailable).map((id) => (
                    <li key={id} data-category-tile={id} data-exam-status="available" className="min-w-0">
                      <div className="flex items-start gap-2.5 text-[0.94rem] font-medium leading-snug text-slate-800">
                        <span aria-hidden="true" className="mt-[0.48rem] h-1.5 w-1.5 flex-none rounded-full bg-emerald-700" />
                        <span className="min-w-0">{activeExamName(id)}</span>
                      </div>
                      {id === 'MUSCULOESQUELETICO' ? (
                        <ul
                          data-msk-regions
                          aria-label="Regiões musculoesqueléticas disponíveis"
                          className="mt-2.5 grid grid-cols-2 gap-x-3 gap-y-1.5 pl-4 min-[420px]:grid-cols-2 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-4"
                        >
                          {MUSCULOSKELETAL_REGIONS.map((region) => (
                            <li key={region} data-msk-region={region} className="flex items-center gap-2 text-[0.82rem] leading-snug text-slate-600">
                              <span aria-hidden="true" className="h-px w-2.5 flex-none bg-emerald-800/50" />
                              {region}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </li>
                  ))}
                </ul>

                {upcoming.length > 0 ? (
                  <div className="mt-5 border-t border-emerald-950/10 pt-3.5">
                    <h4 className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Em breve</h4>
                    <ul aria-label="Exames planejados" className="mt-2.5 flex flex-wrap gap-x-5 gap-y-2">
                      {upcoming.map((name) => (
                        <li key={name} data-coming-soon={name} data-exam-status="upcoming" className="inline-flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1 text-[0.88rem] leading-snug text-slate-600">
                          <span>{name}</span>
                          <span aria-label="Em breve" className="rounded-full bg-emerald-900/[0.06] px-2 py-0.5 text-[0.65rem] font-medium leading-none text-emerald-900/75">
                            Em breve
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      </div>
    </section>
  )
}
