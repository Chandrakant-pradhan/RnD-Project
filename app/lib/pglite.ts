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