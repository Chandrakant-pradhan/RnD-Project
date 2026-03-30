"use client"

import { Home, FileText, Upload, Database, FileSpreadsheet, HardDriveDownload} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export default function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { name: "Home", icon: Home, path: "/" },
    { name: "Query", icon: FileText, path: "/query" },
    { name: "File Upload", icon: Upload, path: "/upload" },
    { name: "View Tables", icon: Database, path: "/tables" },
    { name: "Google Sheets", icon: FileSpreadsheet, path: "/connect" },
    { name: "Backup & Restore", icon: HardDriveDownload, path: "/backup-restore"},
  ]

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col">
      <div className="p-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.path

          return (
            <Link
              key={item.name}
              href={item.path}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg mb-2 transition-colors ${
                isActive
                  ? "bg-blue-50 text-blue-600 font-medium"
                  : "text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </div>

      <div className="p-4 border-t border-slate-200 text-sm text-slate-600 flex items-center gap-2">
        <Database className="w-4 h-4 text-slate-500" />
        <span>Using PGlite DB</span>
      </div>
    </aside>
  )
}