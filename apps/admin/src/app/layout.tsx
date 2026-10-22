import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaudoUSG Admin",
  robots: { index: false, follow: false, nocache: true },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

// Aplica o tema salvo antes da pintura (evita piscar). Sem armazenamento: segue o sistema.
const scriptTema = `try{var t=localStorage.getItem('admin-tema');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptTema }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
