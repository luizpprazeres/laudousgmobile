export type DopplerMode = "combined" | "isolated";

export function dopplerRequestFields(category: string, mode: DopplerMode = "combined") {
  return category === "DOPPLER_OBSTETRICO" ? { doppler_mode: mode } : {};
}
