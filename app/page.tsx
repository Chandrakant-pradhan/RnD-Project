
"use client"

import { useRouter } from "next/navigation";
import { FileText, Database, Upload, FileSpreadsheet, HardDriveDownload} from "lucide-react"

export default function Homepage() {
  const router = useRouter()

  const cards = [
    {
      title: "Query",
      description: "Run SQL queries on the database",
      icon: FileText,
      path: "/query",
    },
    {
      title: "View Tables",
      description: "Browse database tables and data",
      icon: Database,
      path: "/tables",
    },
    {
      title: "File Upload",
      description: "Upload SQL or data files",
      icon: Upload,
      path: "/upload",
    },
    {
      title: "Connect Sheets",
      description: "Connect to Google Drive",
      icon: FileSpreadsheet,
      path: "/connect",
    },
    {
      title: "Backup & Restore",
      description: "Back up your database or restore it using a .sql file",
      icon : HardDriveDownload,
      path: "/backup-restore"
    }
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
      <p className="text-slate-500 mt-2 mb-6">
        Welcome to ShQL — SQL for your sheets
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => {
          const Icon = card.icon

          return (
            <button
              key={card.title}
              onClick={() => router.push(card.path)}
              className="group bg-white border border-slate-200 rounded-xl p-6 text-left
                         hover:shadow-md hover:border-blue-300 transition-all"
            >
              <Icon className="w-8 h-8 text-blue-600 mb-4" />

              <h2 className="text-lg font-semibold text-slate-800">
                {card.title}
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                {card.description}
              </p>
            </button>
          )
        })}
      </div>
    </div>
  )
}