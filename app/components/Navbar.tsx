"use client"

import { Database, Plus, Pencil, Trash2, ChevronDown, Check, X , LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { createDB, renameDB, deleteDB, setActiveDB } from "../lib/pglite"
import { useDB } from "../context/db-context"
import { useToast } from "../components/ToastProvider";
import { useGoogleLogin } from "@react-oauth/google";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { dbs, activeDB: active, setActive, refresh } = useDB()
  const [open, setOpen] = useState(false)
  const [renamingDB, setRenamingDB] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState("")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { showToast } = useToast();
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)
  const [userProfile, setUserProfile] = useState<{ name: string; email: string; picture: string } | null>(null)
  const router = useRouter();

  useEffect(() => {
    if (renamingDB && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingDB])

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (token) setAccessToken(token);
    const profile = sessionStorage.getItem("userProfile");
    if (profile) setUserProfile(JSON.parse(profile));
  }, []);

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

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false)
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
  }

  const handleDelete = async (name: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setActive(name)
    await deleteDB()
    await refresh()
  }

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      setAccessToken(token);
      sessionStorage.setItem("accessToken", token);
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const profile = { name: data.name, email: data.email, picture: data.picture };
      setUserProfile(profile);
      sessionStorage.setItem("userProfile", JSON.stringify(profile));
    },
  });
  
  const logout = () => {
    setAccessToken(null);
    setUserProfile(null);
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userProfile");
    setUserMenuOpen(false);
  };

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
  
          <div className="flex items-center gap-4">
  
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

            <div className="flex items-center gap-3">
              {!accessToken ? (
                <button
                  onClick={() => login()}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 
                             bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors 
                             text-sm font-medium text-slate-700"
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  Sign in with Google
                </button>
              ) : (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border border-slate-200 
                               bg-white hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  >
                    {userProfile?.picture ? (
                      <img src={userProfile.picture} alt={userProfile.name} className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-blue-700 flex items-center justify-center text-[11px] font-semibold text-white">
                        {userProfile?.name?.charAt(0) ?? "?"}
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-700 max-w-[100px] truncate">{userProfile?.name ?? "Account"}</span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-100 z-50 overflow-hidden">
                      <div className="px-3.5 py-3 border-b border-slate-100">
                        <p className="text-sm font-medium text-slate-800">{userProfile?.name ?? "Account"}</p>
                      </div>
                      <button
                        onClick={logout}
                        className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
  
          </div>
        </div>
      </div>
    </nav>
  )
}