import type { ReactNode } from "react";

export const metadata = {
  title: "LaudoUSG API",
  description: "Backend de geração de laudos por IA — sem UI",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
