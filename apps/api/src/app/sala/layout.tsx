import "./fonts.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sala do Auxiliar — LaudoUSG",
  description: "Acompanhe os laudos em tempo real durante o turno.",
};

export default function SalaLayout({ children }: { children: React.ReactNode }) {
  return <>
    <link rel="preload" href="/fonts/InstrumentSerif-italic.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
    <link rel="preload" href="/fonts/InstrumentSerif-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
    <link rel="preload" href="/fonts/InterTight-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
    <link rel="preload" href="/fonts/JetBrainsMono-normal.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
    {children}
  </>;
}
