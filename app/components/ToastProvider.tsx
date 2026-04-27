"use client";

import { createContext, useContext, useState, useEffect } from "react";

type ToastType = "error" | "success" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const STORAGE_KEY = "post_reload_toast";

const ToastContext = createContext<{
  showToast: (message: string, type?: ToastType) => void;
  showToastAfterReload: (message: string, type?: ToastType) => void;
}>({
  showToast: () => {},
  showToastAfterReload: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  function showToast(message: string, type: ToastType = "info") {
    const id = Date.now();

    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }

  function showToastAfterReload(message: string, type: ToastType = "info") {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ message, type })
    );
  }

  function removeToast(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const { message, type } = JSON.parse(stored);
      showToast(message, type);
    } catch {}

    sessionStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, showToastAfterReload }}>
      {children}

      <div className="fixed top-6 left-1/2 -translate-x-1/2 flex flex-col gap-3 z-50">
        {toasts.map((toast) => {
          const color =
            toast.type === "error"
              ? "bg-red-600"
              : toast.type === "success"
              ? "bg-green-600"
              : "bg-yellow-500";

          return (
            <div
              key={toast.id}
              className={`text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-[slideIn_0.2s_ease] ${color}`}
            >
              <span className="text-sm">{toast.message}</span>

              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-80 hover:opacity-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}