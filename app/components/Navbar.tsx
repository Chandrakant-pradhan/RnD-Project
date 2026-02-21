"use client"

import { Database } from "lucide-react"
import Link from "next/link"

export default function Navbar() {
  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Database className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">
              DB Visualizer
            </h1>
          </Link>
        </div>
      </div>
    </nav>
  )
}