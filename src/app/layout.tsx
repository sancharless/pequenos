import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Goobox - Painel de Engajamento SMM de Alta Qualidade",
  description: "Aumente suas redes sociais instantaneamente com Goobox. Seguidores, curtidas, visualizações e mais com integração automática e pagamento Pix instantâneo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
      </body>
    </html>
  );
}
