"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, X, Phone, MessageCircle } from "lucide-react";
import { getMembers, defaultMembers, fetchLiveMembers, subscribeMembers, Member } from "@/lib/storage";
import { PhoneActionModal } from "@/components/PhoneActionModal";

export default function DirectoryPage() {
  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [search, setSearch] = useState("");
  const [selectedBlock, setSelectedBlock] = useState<string>("ALL");
  const [activeModalMember, setActiveModalMember] = useState<Member | null>(null);

  useEffect(() => {
    // 1. Read latest local data immediately
    setMembers([...getMembers()]);

    // 2. Subscribe to any local updates in the app (instant update without refresh)
    const unsubscribe = subscribeMembers((updated) => {
      setMembers([...updated]);
    });

    // 3. Listen for window events across tabs
    const handleSync = () => {
      setMembers([...getMembers()]);
    };
    window.addEventListener("gh_members_updated", handleSync);
    window.addEventListener("storage", handleSync);

    // 4. Single cloud sync on first load to fetch latest records
    fetchLiveMembers().then((data) => {
      if (data && data.length > 0) {
        setMembers([...data]);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener("gh_members_updated", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();

    return members.filter((m) => {
      // Only registered members
      const isOccupied = Boolean(m.name || m.phone);
      if (!isOccupied) {
        return false;
      }

      // Block filter
      if (selectedBlock !== "ALL" && m.block !== selectedBlock) {
        return false;
      }

      // Search filter
      if (q) {
        const matchFlat = String(m.flatNo).toLowerCase().includes(q);
        const matchId = m.id.toLowerCase().includes(q);
        const matchName = (m.name || "").toLowerCase().includes(q);
        const matchPhone = (m.phone || "").includes(q);
        const matchFloor = `${m.floor}`.includes(q);
        const matchDetails = (m.additionalDetails || "").toLowerCase().includes(q);

        if (!matchFlat && !matchId && !matchName && !matchPhone && !matchFloor && !matchDetails) {
          return false;
        }
      }

      return true;
    });
  }, [members, search, selectedBlock]);

  const formatPhone = (phone: string) => {
    const p = phone.replace(/\D/g, "").slice(-10);
    if (p.length === 10) {
      return `+91 ${p.slice(0, 5)} ${p.slice(5)}`;
    }
    return phone;
  };

  const getOrdinalSuffix = (i: number) => {
    const j = i % 10,
      k = i % 100;
    if (j === 1 && k !== 11) return "st";
    if (j === 2 && k !== 12) return "nd";
    if (j === 3 && k !== 13) return "rd";
    return "th";
  };

  const getBlockBadge = (block: string) => {
    switch (block) {
      case "A":
        return "bg-rose-50 text-rose-700 border-rose-100";
      case "B":
        return "bg-sky-50 text-sky-700 border-sky-100";
      case "C":
        return "bg-amber-50 text-amber-700 border-amber-100";
      case "D":
        return "bg-purple-50 text-purple-700 border-purple-100";
      default:
        return "bg-gray-50 text-gray-700 border-gray-100";
    }
  };

  return (
    <div className="space-y-3.5 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            <span>🏢</span> Ganesh Heritage
          </h1>
          <p className="text-xs text-slate-500 font-medium">Resident Directory</p>
        </div>
        <Link
          href="/add"
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-teal-700 text-white text-xs font-semibold hover:bg-teal-800 transition active:scale-95 shadow-sm"
        >
          <span>+</span> Add Name
        </Link>
      </header>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search flat no, resident name, phone..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 transition shadow-sm"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            aria-label="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Block Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
        {["ALL", "A", "B", "C", "D"].map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBlock(b)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedBlock === b
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {b === "ALL" ? "All Blocks" : `Block ${b}`}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <div className="text-[11px] text-slate-400 font-medium px-0.5">
        Showing {filteredMembers.length} {filteredMembers.length === 1 ? "member" : "members"}
      </div>

      {/* Minimal Member Cards List */}
      <div className="space-y-2">
        {filteredMembers.map((m) => {
          const isOccupied = Boolean(m.name || m.phone);
          const blockBadge = getBlockBadge(m.block);

          return (
            <div
              key={m.id}
              className={`bg-white border rounded-xl p-3.5 transition-all shadow-xs ${
                isOccupied ? "border-slate-200" : "border-dashed border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                {/* Flat & Floor */}
                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md border ${blockBadge}`}
                  >
                    Block {m.block} • {m.flatNo}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {m.floor}
                    {getOrdinalSuffix(m.floor)} Floor
                  </span>
                </div>

                {/* Clickable Phone if present */}
                {m.phone ? (
                  <button
                    onClick={() => setActiveModalMember(m)}
                    type="button"
                    className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 bg-teal-50/80 hover:bg-teal-100 px-2 py-1 rounded-lg text-xs font-semibold transition active:scale-95"
                    title="Click to Call or WhatsApp"
                  >
                    <Phone className="w-3 h-3 text-teal-600" />
                    <span>{formatPhone(m.phone)}</span>
                    <MessageCircle className="w-3 h-3 text-emerald-600 ml-0.5" />
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-300 italic">No phone</span>
                )}
              </div>

              {/* Resident Name */}
              <div className="mt-1">
                {isOccupied ? (
                  <h3 className="font-semibold text-slate-900 text-sm tracking-tight leading-snug">
                    {m.name}
                  </h3>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 italic">Vacant</span>
                    <Link
                      href={`/add?block=${m.block}&flat=${m.flatNo}`}
                      className="text-[11px] text-teal-700 font-semibold hover:underline"
                    >
                      + Add Name
                    </Link>
                  </div>
                )}

                {/* Additional Details (minimal display) */}
                {m.additionalDetails && (
                  <p className="text-xs text-slate-500 mt-1.5 leading-relaxed bg-slate-50 p-1.5 rounded border border-slate-100">
                    {m.additionalDetails}
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {filteredMembers.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6 space-y-2">
            <p className="text-sm font-semibold text-slate-700">No flats found</p>
            <p className="text-xs text-slate-400">Try changing your search term or block filter</p>
          </div>
        )}
      </div>

      {/* Action Modal for Phone */}
      {activeModalMember && (
        <PhoneActionModal
          isOpen={Boolean(activeModalMember)}
          onClose={() => setActiveModalMember(null)}
          name={activeModalMember.name}
          phone={activeModalMember.phone}
          unit={`Block ${activeModalMember.block} - ${activeModalMember.flatNo}`}
        />
      )}
    </div>
  );
}
