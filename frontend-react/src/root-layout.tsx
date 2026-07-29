import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import FloatingChatBot from "@/components/chat/floating-chatbot";
import { GoogleTranslateScript } from "@/components/kb/google-translate-script";
import "@/i18n";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GoogleTranslateScript />
      <Outlet />
      <FloatingChatBot />
    </ThemeProvider>
  );
}
