import type { ReactNode } from 'react'

export const metadata = {
  title: 'School Lunch Rota',
  description: 'Weekly lunch and playtime timetable builder',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
