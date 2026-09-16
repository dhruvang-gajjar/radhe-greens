import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center mx-auto text-xl font-bold">
          404
        </div>
        
        <div>
          <h2 className="text-base font-bold text-slate-900">Page Not Found</h2>
          <p className="text-xs text-slate-500 mt-1">
            The page you are looking for does not exist.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href="/"
            className="w-full py-2.5 px-4 bg-teal-700 text-white rounded-xl text-xs font-bold hover:bg-teal-800 transition flex items-center justify-center gap-2"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Directory</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
