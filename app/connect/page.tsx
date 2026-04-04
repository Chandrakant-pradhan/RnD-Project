"use client";

import { useState, useEffect } from "react";
import { useGoogleLogin } from "@react-oauth/google";
import { LogOut, Cloud, Link2, ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "../components/ToastProvider";
import { removeEmptyTopRows } from "../lib/removeEmptyRows";

function extractSheetId(input: string): string | null {
  const match = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match) return match[1];
  if (/^[a-zA-Z0-9-_]{30,}$/.test(input.trim())) return input.trim();
  return null;
}

export default function ConnectPage() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sheetLink, setSheetLink] = useState("");
  const [linkError, setLinkError] = useState("");
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
      openSheet(pendingSheetId, true);
      setPendingSheetId(null);
    }
  }, [accessToken]);

  async function openSheet(fileId: string, retry = false) {
    try {
      setLoading(true);

      let headers: any = {};

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
      );

      const ranges = sheetNames
        .map((name: string) => `ranges=${encodeURIComponent(name)}`)
        .join("&");

      const dataRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${fileId}/values:batchGet?${ranges}`,
        { headers }
      );

      const data = await dataRes.json();

      const results = data.valueRanges.map(
        (range: any, i: number) => ({
          name: `${fileName} - ${sheetNames[i]}`,
          rows: removeEmptyTopRows(range.values || []),
        })
      );

      sessionStorage.setItem("sheets", JSON.stringify(results));

      router.push("/tables");

    } catch (err) {
      showToast("Error opening sheet", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit() {
    setLinkError("");
    const fileId = extractSheetId(sheetLink);
    if (!fileId) {
      setLinkError("Please enter a valid Google Sheets URL.");
      return;
    }
    await openSheet(fileId);
  }

  if (!ready) return null;

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold mb-8 flex items-center gap-2">
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
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="flex-1 bg-transparent outline-none text-sm"
            />
          </div>

          {linkError && (
            <p className="text-xs text-red-500">{linkError}</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
          >
            {loading ? "Loading..." : "Open Sheet"}
          </button>
        </div>

        <p className="text-xs text-slate-400 mt-4">
          Works with public sheets and private sheets you have access to.
        </p>
      </div>
    </div>
  );
}