"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { fetchDBs, setActiveDB, getActiveDB } from "../lib/pglite"

interface DBContextType {
  dbs: string[]
  activeDB: string | null
  setActive: (name: string) => void
  refresh: () => Promise<void>
}

const DBContext = createContext<DBContextType | null>(null)

export function DBProvider({ children }: { children: React.ReactNode }) {
  const [dbs, setDbs] = useState<string[]>([])
  const [activeDB, setActiveDBState] = useState<string | null>(null)

  const refresh = async () => {
    const list = await fetchDBs()
    setDbs(list)
    setActiveDBState(getActiveDB())
  }

  const setActive = (name: string) => {
    setActiveDB(name)          
    setActiveDBState(name)      
  }

  useEffect(() => {
    refresh()
  }, [])

  return (
    <DBContext.Provider value={{ dbs, activeDB, setActive, refresh }}>
      {children}
    </DBContext.Provider>
  )
}

export function useDB() {
  const ctx = useContext(DBContext)
  if (!ctx) throw new Error("useDB must be used within a DBProvider")
  return ctx
}