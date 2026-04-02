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
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!;

  return (
    <html lang="en">
      <body className="h-screen flex flex-col">
        <GoogleOAuthProvider clientId={clientId}>
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
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}