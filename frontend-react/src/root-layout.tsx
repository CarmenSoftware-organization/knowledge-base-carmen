import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import FloatingChatBot from "@/components/chat/floating-chatbot";
import "@/i18n";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Outlet />
      <FloatingChatBot />
    </ThemeProvider>
  );
}
