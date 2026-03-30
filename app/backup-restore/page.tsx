"use client";

import { useState } from "react";
import { removeDB } from "../lib/pglite";
import { getDB } from "../lib/pglite";
import { useToast } from "../components/ToastProvider";

export default function BackupAndRestore() {
  const [loading, setLoading] = useState<string | null>(null);
  const { showToast } = useToast();

  async function handleBackup() {
    try {
      setLoading("backup");

      const db = await getDB();
      const blob = await db.dumpDataDir("gzip");

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "pglite-backup.tar.gz";
      a.click();

      URL.revokeObjectURL(url);
    } catch (err) {
      showToast("Backup failed" , "error");
    } finally {
      setLoading(null);
    }
  }

  async function handleRestore(file: File) {
    try {
      setLoading("restore");

      const { loadDB } = await import("../lib/pglite");
      await loadDB(file);

      setLoading(null);

      showToast("Restore successful" , "success");

    } catch (err) {
      showToast("Restore failed" , "error");
      setLoading(null);
    }
  }


  async function handleDelete() {
    try {
      setLoading("delete");

      await removeDB();

      //await new Promise((res) => setTimeout(res, 200));

      showToast("Database deleted" , "success");

    } catch (err) {
      showToast("Failed to delete DB" , "error");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">
        Backup & Restore
      </h1>

      <div className="grid md:grid-cols-2 gap-6">
        
        <div className="border rounded-xl p-5 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold text-slate-700">
            Backup
          </h2>

          <p className="text-sm text-slate-500">
            Download a snapshot of your database as a .tar.gz file.
          </p>

          <button
            onClick={handleBackup}
            disabled={loading !== null}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer disabled:opacity-50"
          >
            {loading === "backup" ? "Backing up..." : "Download Backup"}
          </button>
        </div>

        <div className="border rounded-xl p-5 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-slate-700">
            Restore
          </h2>

          <p className="text-sm text-slate-500">
            Upload backup file to restore DB (first delete current database).
          </p>

          <div className="flex items-center gap-3">
            <label
              className="px-3 py-2 bg-slate-100 border rounded cursor-pointer hover:bg-slate-200 text-sm"
            >
              Upload File
              <input
                type="file"
                accept=".tar.gz"
                disabled={loading !== null}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleRestore(file);
                }}
              />
            </label>

            <span className="text-sm text-slate-500">
              .tar.gz only
            </span>
          </div>

          {loading === "restore" && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              Restoring database...
            </div>
          )}
        </div>
      </div>

      <div className="border border-red-300 rounded-xl p-5 space-y-3">
        <h2 className="text-lg font-semibold text-red-600">
          Danger Zone
        </h2>

        <p className="text-sm text-slate-500">
          Permanently delete your database.
        </p>

        <button
          onClick={handleDelete}
          disabled={loading !== null}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer disabled:opacity-50"
        >
          {loading === "delete" ? "Deleting..." : "Delete Database"}
        </button>
      </div>
    </div>
  );
}