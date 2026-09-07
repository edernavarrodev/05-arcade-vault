import type { Metadata } from "next";
import { Press_Start_2P, JetBrains_Mono } from "next/font/google";
import { SessionProvider } from "@/lib/session";
import Nav from "@/components/Nav";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const pixelFont = Press_Start_2P({
  variable: "--font-pixel",
  weight: "400",
  subsets: ["latin"],
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Arcade Vault",
  description: "Plataforma para jugar online y competir por puntos",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Verificación temporal SPEC 04: confirma que el cliente Supabase conecta sin error.
  const supabase = await createClient();
  const { error } = await supabase.from("nonexistent_check").select("*").limit(1);
  console.log(
    "[supabase check]",
    error?.code === "42P01"
      ? "conexión OK (tabla no existe, esperado)"
      : error
        ? error.message
        : "OK",
  );

  return (
    <html lang="es" className={`${pixelFont.variable} ${monoFont.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <SessionProvider>
          <Nav />
          <main className="av-main">{children}</main>
          <footer
            style={{
              borderTop: "1px solid var(--line)",
              padding: "20px 32px",
              textAlign: "center",
              color: "var(--ink-faint)",
              fontFamily: "var(--mono)",
              fontSize: 11,
              letterSpacing: "0.16em",
            }}
          >
            © 2026 ARCADE VAULT · HECHO CON PIXELES Y NEÓN · v2.6.0
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
