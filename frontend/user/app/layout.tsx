import React from "react"
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { getLocale } from 'next-intl/server'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import './globals.css'
import FloatingChatBot from "@/components/chat/floating-chatbot"
import { ThemeProvider } from "@/components/theme-provider"

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Carmen Knowledge Base',
  description: 'ศูนย์รวมความรู้และคู่มือการใช้งานสำหรับ Carmen Chatbot',
  icons: {
    icon: [
      { url: '/carmen-favicon-circle-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/carmen-favicon-circle-16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: '/carmen-favicon-circle-180.png',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider>
            {children}
            <FloatingChatBot />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}