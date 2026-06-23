import { Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import "@/i18n";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <Outlet />
      {/* <FloatingChatBot /> is wired in Phase 7 */}
    </ThemeProvider>
  );
}
