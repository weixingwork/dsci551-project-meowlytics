import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Meowlytics - Cat Food Ingredient Analysis",
  description: "Use AI to analyze cat food ingredient labels and help you choose healthy cat food",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
