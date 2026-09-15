import type { ReactNode } from "react";
import "./globals.css";

const RootLayout = ({ children }: { children: ReactNode }) => {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <body className="bg-background text-foreground min-h-full">{children}</body>
    </html>
  );
};

export default RootLayout;
