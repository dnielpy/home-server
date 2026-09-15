import { AppLayoutContainer } from "@/src/modules/layout/components/app-layout-container";
import "./globals.css";

export const RootLayout = ({ children }: LayoutProps<"/">) => {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        <AppLayoutContainer>{children}</AppLayoutContainer>
      </body>
    </html>
  );
};

export default RootLayout;
