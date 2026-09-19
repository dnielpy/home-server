import { Suspense, type ReactNode } from "react";
import { NavigationProgress } from "@/src/modules/layout/components/navigation-progress";
import "./globals.css";

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-full">
        <Suspense fallback={null}>
          <NavigationProgress />
        </Suspense>
        {children}
      </body>
    </html>
  );
};

export default RootLayout;
