import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sala do Auxiliar — LaudoUSG",
  description: "Acompanhe os laudos em tempo real durante o turno.",
};

export default function SalaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
