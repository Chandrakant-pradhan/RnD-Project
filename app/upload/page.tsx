"use client";

import { useState , useEffect} from "react";
import { Upload } from "lucide-react";
import { getDB } from "../lib/pglite";
import { useToast } from "../components/ToastProvider";
import { useDB } from "../context/db-context";
import { setTableSchema } from "../lib/schema";

export default function FileUploader() {
  const [db, setDb] = useState<any>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { showToast } = useToast();
  const { activeDB } = useDB();

  useEffect(() => {
      async function init() {
        const database = await getDB();
        setDb(database);
      }
      init();
  }, [activeDB]);

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);

    try {
      const sql = await file.text();

      await db.exec(sql);
      const createTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["']?(\w+)["']?\s*\([^;]+\);/gi;
      let match;
      while ((match = createTableRegex.exec(sql)) !== null) {
         const tableName = match[1].toLowerCase();
         const ddl = match[0];
         setTableSchema(activeDB, tableName, ddl); // save schema 
      }
      showToast("File loaded successfully" , "success");

    } catch (err: any) {
      showToast(err?.message || "Failed to load file in DB" , "error");
    }
  };

  return (
    <div className="max-w-xl p-6">
      <h1 className="text-2xl font-bold text-slate-800">File Upload</h1>
      <p className="text-slate-500 mt-2 mb-6">
        Upload a SQL file to execute DDL or DML commands.
      </p>

      <label
        htmlFor="sql-upload"
        className="cursor-pointer block bg-white border-2 border-dashed border-slate-300 rounded-xl p-8
                   text-center hover:border-blue-400 hover:bg-slate-50 transition"
      >
        <Upload className="w-10 h-10 text-blue-600 mx-auto mb-3" />

        <p className="font-medium text-slate-700">
          Click to upload a <span className="font-semibold">.sql</span> file
        </p>

        <p className="text-sm text-slate-500 mt-1">
          DDL & DML statements are supported
        </p>

        <input
          id="sql-upload"
          type="file"
          accept=".sql"
          onChange={handleFileUpload}
          className="hidden"
        />
      </label>

      {fileName && (
        <p className="mt-4 text-sm text-slate-600">
          Selected file: <span className="font-medium">{fileName}</span>
        </p>
      )}

    </div>
  );
}