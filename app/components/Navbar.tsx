"use client"

import { Database, Plus, Pencil, Trash2, ChevronDown, Check, X } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { createDB, renameDB, deleteDB, setActiveDB } from "../lib/pglite"
import { useDB } from "../context/db-context"
import { useToast } from "../components/ToastProvider";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { dbs, activeDB: active, setActive, refresh } = useDB()
  const [open, setOpen] = useState(false)
  const [renamingDB, setRenamingDB] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const { showToastAfterReload } = useToast();
  const router = useRouter();

  useEffect(() => {
    if (renamingDB && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingDB])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
        setRenamingDB(null)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const handleSelect = (name: string) => {
    setActive(name)
    setOpen(false)
    router.push("/query");
  }

  const handleCreate = async () => {
    await createDB()
    await refresh()
    setOpen(true)
  }

  const handleRenameSubmit = async (oldName: string) => {
    const trimmed = renameValue.trim()
    if (!trimmed || trimmed === oldName) {
      setRenamingDB(null)
      return
    }
    setActive(oldName)
    await renameDB(trimmed)
    setRenamingDB(null)
    await refresh()
    showToastAfterReload("DB renamed successfully" , "success");
  }

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActive(name)
    await deleteDB()
    await refresh()
    showToastAfterReload("DB removed successfully" , "success");
  }

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Database className="w-6 h-6 text-blue-600" />
            <h1 className="text-xl font-bold text-slate-800">ShQL</h1>
          </Link>

          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500 font-medium">
                <b>Select Database :</b>
              </span>

              <button
                onClick={() => setOpen((v) => !v)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 
                          bg-slate-50 hover:bg-slate-100 transition-colors 
                          text-sm font-medium text-slate-700 min-w-[180px] justify-between"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      active ? "bg-emerald-400" : "bg-slate-300"
                    }`}
                  />
                  <span className="truncate max-w-[120px]">
                    {active ?? "No DB"}
                  </span>
                </span>

                <ChevronDown
                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                    open ? "rotate-180" : ""
                  }`}
                />
              </button>
            </div>

            {open && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-100 z-50 overflow-hidden">
                <div className="max-h-64 overflow-y-auto">
                  {dbs.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <Database className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                      <p className="text-xs text-slate-400 font-medium">No databases yet</p>
                    </div>
                  ) : (
                    <ul className="py-1">
                      {dbs.map((name) => (
                        <li key={name}>
                          {renamingDB === name ? (
                            <div
                              className="flex items-center gap-1.5 px-2 py-1.5 mx-1 rounded-lg bg-blue-50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                ref={renameInputRef}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameSubmit(name)
                                  if (e.key === "Escape") setRenamingDB(null)
                                }}
                                className="flex-1 text-sm bg-white border border-blue-200 rounded-md px-2 py-0.5 outline-none focus:ring-1 focus:ring-blue-400 text-slate-700 min-w-0"
                              />
                              <button
                                onClick={() => handleRenameSubmit(name)}
                                className="p-1 rounded-md hover:bg-blue-100 text-blue-600 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setRenamingDB(null)}
                                className="p-1 rounded-md hover:bg-slate-100 text-slate-400 transition-colors"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => handleSelect(name)}
                              className={`flex items-center gap-2 px-2 py-1.5 mx-1 rounded-lg cursor-pointer group transition-colors ${
                                active === name
                                  ? "bg-blue-50 text-blue-700"
                                  : "hover:bg-slate-50 text-slate-700"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  active === name ? "bg-blue-400" : "bg-slate-200"
                                }`}
                              />
                              <span className="flex-1 text-sm font-medium truncate">
                                {name}
                              </span>
                              { name !== "Default DB"  && 
                               (<div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setRenamingDB(name)
                                    setRenameValue(name)
                                  }}
                                  className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                                  title="Rename"
                                >
                                  <Pencil className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => handleDelete(name, e)}
                                  className="p-1 rounded-md hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                  title="Delete"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>)}
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border-t border-slate-100 p-1">
                  <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium"
                  >
                    <Plus className="w-3.5 h-3.5 text-blue-500" />
                    New database
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}