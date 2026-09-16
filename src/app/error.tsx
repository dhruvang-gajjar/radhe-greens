"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-6 h-6" />
        </div>
        
        <div>
          <h2 className="text-base font-bold text-slate-900">Something went wrong</h2>
          <p className="text-xs text-slate-500 mt-1">
            Don't worry, your member data is safe. Please try refreshing or return to the directory.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={() => reset()}
            className="w-full py-2.5 px-4 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
          
          <Link
            href="/"
            className="w-full py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-200 transition flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Go to Directory</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
