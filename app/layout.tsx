import "./globals.css"
import Sidebar from "./components/Sidebar"
import Navbar from "./components/Navbar"

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen flex flex-col">

          <Navbar />

          <div className="flex flex-1">
            <Sidebar />

            <main className="flex-1 p-6 bg-slate-50 overflow-auto">
              {children}
            </main>
          </div>

      </body>
    </html>
  )
}