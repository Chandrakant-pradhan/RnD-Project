"use client";

import { PGlite } from "@electric-sql/pglite";

let db: PGlite | null = null;

export async function getDB() {
  if (!db) {
    db = await PGlite.create({
      dataDir: "idb://db",
    });
  }
  return db;
}

export async function removeDB(){
  db = await getDB();
  if(db){
    await db.close();
  }
  indexedDB.deleteDatabase("/pglite/db");

  window.location.reload();
  
}

export async function loadDB(file: File): Promise<PGlite> {
  
  db = await PGlite.create({
    dataDir: "idb://db",
    loadDataDir: file,
  });

  return db;
}