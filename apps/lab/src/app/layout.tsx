import type { Metadata } from "next";
import { Barlow, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PageHeader } from "@/components/PageHeader";
import { Sidebar } from "@/components/Sidebar";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700"],
});

const barlow = Barlow({
  subsets: ["latin"],
  variable: "--font-barlow",
  weight: ["500", "600", "700", "800"],
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "LaudoUSG.lab",
  description: "Painel administrativo do LaudoUSG — calibração e diagnóstico do RAG",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.variable} ${barlow.variable} ${mono.variable} bg-stone-50 font-sans text-stone-900`}
      >
        <Sidebar />
        <div className="pl-16">
          <PageHeader />
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
