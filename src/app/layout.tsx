import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pequenos Estilosos | Moda Infantil com Estilo & Conforto",
  description: "Encontre roupas infantis cheias de estilo e conforto para seus pequenos. Vestidos, conjuntos, jardineiras, bodys e muito mais com pagamento fácil via PIX (Mercado Pago) e compartilhamento rápido para redes sociais.",
  openGraph: {
    title: "Pequenos Estilosos | Moda Infantil com Estilo & Conforto",
    description: "Roupas infantis lindas, confortáveis e cheias de estilo. Compre online e pague com PIX no Mercado Pago.",
    type: "website",
    locale: "pt_BR",
    siteName: "Pequenos Estilosos",
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="icon" href="/icon.png" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
