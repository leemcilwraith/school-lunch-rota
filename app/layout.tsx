import type { ReactNode } from "react";

export const metadata = {
  title: "School Lunch Rota",
  description: "Lunch and playtime rota planner",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
