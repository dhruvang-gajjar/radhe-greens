"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, X, Phone, MessageCircle, Pencil, Building, Home } from "lucide-react";
import { getMembers, defaultMembers, fetchLiveMembers, subscribeMembers, Member } from "@/lib/storage";
import { PhoneActionModal } from "@/components/PhoneActionModal";
import { societyConfig, getBlockBadge, getBlockName } from "@/config/society";

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
    window.addEventListener(societyConfig.storage.updateEvent, handleSync);
    window.addEventListener("storage", handleSync);

    // 4. Single cloud sync on first load to fetch latest records
    fetchLiveMembers().then((data) => {
      if (data && data.length > 0) {
        setMembers([...data]);
      }
    });

    return () => {
      unsubscribe();
      window.removeEventListener(societyConfig.storage.updateEvent, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const cleanQ = q.replace(/[\s-]/g, "");

    return members.filter((m) => {
      // Registered / Occupied flats
      const hasFamily = Array.isArray(m.familyMembers) && m.familyMembers.length > 0;
      const hasVehicles = Array.isArray(m.vehicles) && m.vehicles.length > 0;
      const isOccupied = Boolean(m.name || m.phone || hasFamily || hasVehicles);
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
        const matchFamily = hasFamily && m.familyMembers!.some((f) =>
          (f.name || "").toLowerCase().includes(q) ||
          (f.phone || "").includes(q) ||
          (f.relation || "").toLowerCase().includes(q)
        );
        const matchVehicle = hasVehicles && m.vehicles!.some((v) => {
          const reg = (v.regNo || "").toLowerCase();
          const regNormalized = reg.replace(/[\s-]/g, "");
          return reg.includes(q) || (cleanQ.length > 0 && regNormalized.includes(cleanQ));
        });
        const matchOwner = m.residentType === "Tenant" && (
          (m.ownerName || "").toLowerCase().includes(q) ||
          (m.ownerPhone || "").includes(q)
        );

        if (!matchFlat && !matchId && !matchName && !matchPhone && !matchFloor && !matchDetails && !matchFamily && !matchVehicle && !matchOwner) {
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

  return (
    <div className="space-y-3.5 pb-20">
      {/* Header */}
      <header className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
            <span>🏢</span> {societyConfig.name}
          </h1>
          <p className="text-xs text-slate-500 font-medium">{societyConfig.tagline}</p>
        </div>
        <Link
          href="/add"
          className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-red-700 text-white text-xs font-semibold hover:bg-red-800 transition active:scale-95 shadow-sm"
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
          placeholder="Search flat no, resident name, phone, vehicle, owner..."
          className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition shadow-sm"
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
        {["ALL", ...societyConfig.blocks.map((b) => b.id)].map((b) => (
          <button
            key={b}
            onClick={() => setSelectedBlock(b)}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedBlock === b
                ? "bg-red-700 text-white shadow-sm"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {b === "ALL" ? "All Blocks" : getBlockName(b)}
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
          const isTenant = m.residentType === "Tenant";

          return (
            <div
              key={m.id}
              className={`bg-white border rounded-xl p-3.5 transition-all shadow-xs ${
                isOccupied ? "border-slate-200" : "border-dashed border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                {/* Flat, Floor, and Resident Type Badges */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md border ${blockBadge}`}
                  >
                    Block {m.block} • {m.flatNo}
                  </span>
                  <span className="text-[11px] font-medium text-slate-400">
                    {m.floor}
                    {getOrdinalSuffix(m.floor)} Floor
                  </span>
                  {isTenant ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                      <Building className="w-2.5 h-2.5" />
                      <span>Tenant</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-50 text-slate-600 border border-slate-200">
                      <Home className="w-2.5 h-2.5" />
                      <span>Owner</span>
                    </span>
                  )}
                </div>

                {/* Clickable Phone if present */}
                {m.phone ? (
                  <button
                    onClick={() => setActiveModalMember(m)}
                    type="button"
                    className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 bg-teal-50/80 hover:bg-teal-100 px-2 py-1 rounded-lg text-xs font-semibold transition active:scale-95 shrink-0"
                    title="Click to Call or WhatsApp"
                  >
                    <Phone className="w-3 h-3 text-teal-600" />
                    <span>{formatPhone(m.phone)}</span>
                    <MessageCircle className="w-3 h-3 text-emerald-600 ml-0.5" />
                  </button>
                ) : Array.isArray(m.familyMembers) && m.familyMembers.length > 0 ? (
                  <button
                    onClick={() => setActiveModalMember(m)}
                    type="button"
                    className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 bg-teal-50/80 hover:bg-teal-100 px-2 py-1 rounded-lg text-xs font-semibold transition active:scale-95 shrink-0"
                    title="Click to Call or WhatsApp Family Member"
                  >
                    <Phone className="w-3 h-3 text-teal-600" />
                    <span>Contact Family</span>
                  </button>
                ) : (
                  <span className="text-[11px] text-slate-300 italic">No phone</span>
                )}
              </div>

              {/* Resident Name */}
              <div className="mt-1">
                {isOccupied ? (
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-slate-900 text-sm tracking-tight leading-snug">
                      {m.name || "Resident"}
                    </h3>
                    {societyConfig.allowEdit && (
                      <Link
                        href={`/add?block=${m.block}&flat=${m.flatNo}`}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-red-700 bg-slate-50 hover:bg-red-50 hover:border-red-200 px-2 py-0.5 rounded-md border border-slate-200 transition shrink-0 active:scale-95"
                        title={`Edit details for Block ${m.block} • Flat ${m.flatNo}`}
                      >
                        <Pencil className="w-3 h-3 text-slate-400" />
                        <span>Edit</span>
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 italic">Vacant</span>
                    <Link
                      href={`/add?block=${m.block}&flat=${m.flatNo}`}
                      className="text-[11px] text-red-700 font-semibold hover:underline inline-flex items-center gap-1"
                    >
                      <Pencil className="w-3 h-3" />
                      <span>+ Add Name</span>
                    </Link>
                  </div>
                )}

                {/* Owner Information (Shown when flat is Tenant-occupied) */}
                {isTenant && (m.ownerName || m.ownerPhone) && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-xs bg-amber-50/50 -mx-1 px-2 py-1 rounded-lg border border-amber-100/60">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-bold text-amber-900 shrink-0">Owner:</span>
                      <span className="text-[11px] font-medium text-slate-800 truncate">
                        {m.ownerName || "Flat Owner"}
                      </span>
                    </div>
                    {m.ownerPhone && (
                      <button
                        type="button"
                        onClick={() => setActiveModalMember(m)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 hover:text-amber-950 shrink-0"
                        title="Contact Owner"
                      >
                        <Phone className="w-2.5 h-2.5 text-amber-700" />
                        <span>{formatPhone(m.ownerPhone)}</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Family Members tags if present */}
                {Array.isArray(m.familyMembers) && m.familyMembers.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-medium">Family:</span>
                    {m.familyMembers.map((f, fIdx) => (
                      <button
                        key={fIdx}
                        type="button"
                        onClick={() => setActiveModalMember(m)}
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-50 hover:bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200 transition font-medium"
                        title={`Click to contact ${f.name}`}
                      >
                        <span>{f.name}</span>
                        {f.relation && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({f.relation})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Vehicles tags if present */}
                {Array.isArray(m.vehicles) && m.vehicles.length > 0 && (
                  <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 flex-wrap">
                    <span className="text-[11px] text-slate-400 font-medium">Vehicles:</span>
                    {m.vehicles.map((v, vIdx) => (
                      <span
                        key={vIdx}
                        className="inline-flex items-center gap-1 text-[11px] bg-slate-50 text-slate-800 px-2 py-0.5 rounded-md border border-slate-200 font-mono font-medium"
                      >
                        <span>{v.type === "Bike" ? "🛵" : v.type === "Car" ? "🚗" : "🚙"}</span>
                        <span>{v.regNo}</span>
                      </span>
                    ))}
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

      {/* Clean Directory Footer */}
      <footer className="pt-6 pb-2 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <span>{societyConfig.name}</span>
        <span>•</span>
        <span>{societyConfig.societyType}</span>
      </footer>

      {/* Action Modal for Phone */}
      {activeModalMember && (
        <PhoneActionModal
          isOpen={Boolean(activeModalMember)}
          onClose={() => setActiveModalMember(null)}
          name={activeModalMember.name}
          phone={activeModalMember.phone}
          unit={`Block ${activeModalMember.block} - ${activeModalMember.flatNo}`}
          block={activeModalMember.block}
          flatNo={activeModalMember.flatNo}
          residentType={activeModalMember.residentType}
          ownerName={activeModalMember.ownerName}
          ownerPhone={activeModalMember.ownerPhone}
          familyMembers={activeModalMember.familyMembers}
        />
      )}
    </div>
  );
}
