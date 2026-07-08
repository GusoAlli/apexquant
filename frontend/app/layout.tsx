import type { Metadata } from "next";
import { Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import "./globals.css";
import Footer from "@/components/layout/Footer";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ApexQuant | AI Quant Trading",
  description: "Institutional AI quant trading command center.",
};

const LOCALES = ['en','id','ar','zh','es','pt','fr','de','ja','ko','ru','tr','hi'] as const;
const RTL_LOCALES = ['ar'] as const;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const raw = cookieStore.get('aq_locale')?.value ?? 'en';
  const locale = (LOCALES as readonly string[]).includes(raw) ? raw : 'en';
  const dir = (RTL_LOCALES as readonly string[]).includes(locale) ? 'rtl' : 'ltr';
  const messages = (await import(`../messages/${locale}.json`)).default as Record<string, Record<string, string>>;

  return (
    <html
      lang={locale}
      dir={dir}
      data-scroll-behavior="smooth"
      className={`${jakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
        <Footer />
      </body>
    </html>
  );
}
