import "./globals.css"
import Sidebar from "./components/Sidebar"
import Navbar from "./components/Navbar"
import { GoogleOAuthProvider } from "@react-oauth/google";
import ToastProvider from "./components/ToastProvider";
import { DBProvider } from "./context/db-context";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="h-screen flex flex-col">
          <DBProvider>
            <ToastProvider>
              <Navbar />
              <div className="flex flex-1">
                <Sidebar />
                <main className="flex-1 p-6 bg-slate-50 overflow-auto">
                  {children}
                </main>
              </div>
            </ToastProvider>
          </DBProvider>
      </body>
    </html>
  );
}