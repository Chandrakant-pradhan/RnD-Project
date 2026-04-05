"use client";

import { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { LogOut, Cloud, Link2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "../components/ToastProvider";
import { removeEmptyTopRows } from "../lib/removeEmptyRows";
import SheetPreview from "../components/SheetPreview";

interface PreviewState {
  rawValues: string[][];  
  sheetNames: string[];
  activeTabIdx: number;
  fileId: string;
  fileName: string;
  headers: Record<string, string>;
}

function extractSheetId(input: string): string | null {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{30,}$/.test(input.trim())) return input.trim();
  return null;
}

export default function ConnectPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [sheetLink, setSheetLink] = useState("");
  const [linkError, setLinkError] = useState("");
  const [fetchingPreview, setFetchingPreview] = useState(false);
  const [preview, setPreview]           = useState<PreviewState | null>(null);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const { showToast } = useToast();
  const router = useRouter();
  const [pendingSheetId, setPendingSheetId] = useState<string | null>(null);

  const login = useGoogleLogin({
    scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
    onSuccess: async (tokenResponse) => {
      const token = tokenResponse.access_token;
      setAccessToken(token);
      sessionStorage.setItem("accessToken", token);
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const profile = {
        name: data.name,
        email: data.email,
        picture: data.picture,
      };

      setUserProfile(profile);
      sessionStorage.setItem("userProfile", JSON.stringify(profile));
    },
    onError: () => showToast("Login Failed", "error"),
  });

  const logout = () => {
    setAccessToken(null);
    setUserProfile(null);
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("userProfile");
  };

  useEffect(() => {
    const token = sessionStorage.getItem("accessToken");
    if (token) setAccessToken(token);
    const profile = sessionStorage.getItem("userProfile");
    if (profile) setUserProfile(JSON.parse(profile));
    setReady(true);
  }, []);

  useEffect(() => {
    if (accessToken && pendingSheetId) {
      loadPreview(pendingSheetId);
      setPendingSheetId(null);
    }
  }, [accessToken]);

  async function loadPreview(fileId: string) {
    try {
      setFetchingPreview(true);
      setLinkError("");
      setPreview(null);

      let headers: Record<string, string> = {};

      let metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${fileId}`,
        { headers }
      );

      if ((metaRes.status === 401 || metaRes.status === 403)) {
        if (!accessToken) {
          showToast("This sheet requires permission. Please sign in.", "info");
          setPendingSheetId(fileId);
          login();
          return;
        }

        headers = {
          Authorization: `Bearer ${accessToken}`,
        };

        metaRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${fileId}`,
          { headers }
        );

        if (metaRes.status === 403) {
          setLinkError("You don’t have access to this sheet.");
          return;
        }
      }

      if (!metaRes.ok) {
        setLinkError("Invalid or inaccessible sheet.");
        return;
      }

      const meta = await metaRes.json();
      const fileName = meta.properties?.title ?? "Untitled";
      const sheetNames = meta.sheets.map(
        (s: any) => s.properties.title
      ) as string[];

      const firstTab  = sheetNames[0];
      const valuesRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${encodeURIComponent(firstTab)}`,
        { headers }
      );
      const valuesData = await valuesRes.json();
      const rawValues: string[][] = valuesData.values ?? [];

      setPreview({ rawValues, sheetNames, activeTabIdx: 0, fileId, fileName, headers });
    } catch {
      showToast("Error loading sheet preview", "error");
    } finally {
      setFetchingPreview(false);
    }
  }

  async function switchPreviewTab(idx: number) {
    if (!preview) return;
    const tabName = preview.sheetNames[idx];
    try {
      setFetchingPreview(true);
      const res  = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${preview.fileId}/values/${encodeURIComponent(tabName)}`,
        { headers: preview.headers }
      );
      const data = await res.json();
      setPreview({ ...preview, rawValues: data.values ?? [], activeTabIdx: idx });
    } catch {
      showToast("Failed to load tab", "error");
    } finally {
      setFetchingPreview(false);
    }
  }

  async function openSheet(range: string | null) {
    if (!preview) return;
    const { fileId, fileName, sheetNames, headers, activeTabIdx } = preview;

    try {
      setLoadingFinal(true);
      let results: { name: string; rows: string[][] }[];

      if (range) {
        const tabName    = sheetNames[activeTabIdx];
        const rangeParam = `${encodeURIComponent(tabName)}!${range}`;
        const res        = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values/${rangeParam}`,
          { headers }
        );
        const data = await res.json();
        results = [{
          name: `${fileName} - ${tabName} (${range})`,
          rows: removeEmptyTopRows(data.values ?? []),
        }];
      } else {
        const ranges  = sheetNames.map((n) => `ranges=${encodeURIComponent(n)}`).join("&");
        const dataRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values:batchGet?${ranges}`,
          { headers }
        );
        const data = await dataRes.json();
        results = data.valueRanges.map((range: any, i: number) => ({
          name: `${fileName} - ${sheetNames[i]}`,
          rows: removeEmptyTopRows(range.values || []),
        }));
      }
      sessionStorage.setItem("sheets", JSON.stringify(results));
      sessionStorage.setItem("sheetSource", JSON.stringify({
        fileId,
        fileName,
        range: range ?? null,
        tabIdx: activeTabIdx,
        sheetNames,
      }));
      router.push("/tables");
    } catch {
      showToast("Error opening sheet", "error");
    } finally {
      setLoadingFinal(false);
    }
  }

  async function handleSubmit() {
    setLinkError("");
    const fileId = extractSheetId(sheetLink);
    if (!fileId) {
      setLinkError("Please enter a valid Google Sheets URL.");
      return;
    }
    await loadPreview(fileId);
  }

  if (!ready) return null;

  return (
    <div className="p-8 max-w-4xl space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <Cloud className="w-6 h-6 text-blue-600" />
        Google Sheets
      </h1>

      <div className="bg-white p-6 rounded-2xl shadow-sm border max-w-xl">
        {userProfile && (
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-3">
              <img 
              src={userProfile.picture} 
              className="w-9 h-9 rounded-full"
              />
              <div>
                <p className="text-sm font-semibold">{userProfile.name}</p>
                <p className="text-xs text-slate-400">{userProfile.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md
                        text-xs font-medium text-red-500 
                        hover:bg-red-50 hover:text-red-600 
                        transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        )}

        <p className="text-sm text-slate-600 mb-4">
          Paste a Google Sheets link below. This app only reads your sheet in view-only mode and cannot modify or delete any data.
        </p>

        <div className="space-y-3">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl border bg-slate-50">
            <Link2 className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={sheetLink}
              onChange={(e) => setSheetLink(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          {linkError && (
            <p className="text-xs text-red-500">{linkError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={fetchingPreview}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 transition-colors"
          >
            {fetchingPreview ? (
              <><Loader2 className="w-4 h-4 animate-spin" />Loading preview…</>
            ) : "Preview Sheet"}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Works with public sheets and private sheets you have access to.
        </p>
      </div>
      {preview && (
        <div className="space-y-4">
          {preview.sheetNames.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {preview.sheetNames.map((name, idx) => (
                <button
                  key={idx}
                  onClick={() => switchPreviewTab(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    idx === preview.activeTabIdx
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-white border text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <SheetPreview
            rawValues={preview.rawValues}
            onOpen={openSheet}
            sheetName={`${preview.fileName} — ${preview.sheetNames[preview.activeTabIdx]}`}
            loading={fetchingPreview}
            isOpening={loadingFinal}
          />
        </div>
      )}
    </div>
  );
}