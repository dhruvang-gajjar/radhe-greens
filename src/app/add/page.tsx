"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, AlertCircle } from "lucide-react";
import { getMembers, findMember, saveMember, Member } from "@/lib/storage";

function AddResidentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedBlock, setSelectedBlock] = useState<string>("A");
  const [selectedFlat, setSelectedFlat] = useState<string>("101");
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [additionalDetails, setAdditionalDetails] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const loaded = getMembers();
    setMembers(loaded);

    // Read query parameters if navigated from a card
    const blockParam = searchParams.get("block")?.toUpperCase();
    const flatParam = searchParams.get("flat");

    if (blockParam && ["A", "B", "C", "D"].includes(blockParam)) {
      setSelectedBlock(blockParam);
    }

    if (flatParam) {
      setSelectedFlat(flatParam);
    }
  }, [searchParams]);

  // When block changes, update flat selector and check existing data
  const blockFlats = members.filter((m) => m.block === selectedBlock);

  // Sync form when flat selection changes
  useEffect(() => {
    if (!selectedBlock || !selectedFlat) return;
    const existing = findMember(selectedBlock, selectedFlat);
    if (existing && (existing.name || existing.phone)) {
      setName(existing.name || "");
      setPhone(existing.phone || "");
      setAdditionalDetails(existing.additionalDetails || "");
    } else {
      setName("");
      setPhone("");
      setAdditionalDetails("");
    }
  }, [selectedBlock, selectedFlat]);

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setPhone(clean);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter resident name");
      return;
    }

    if (phone && phone.trim().length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    saveMember({
      block: selectedBlock,
      flatNo: selectedFlat,
      name: name.trim(),
      phone: phone.trim(),
      additionalDetails: additionalDetails.trim(),
    });

    setSuccess(true);
    setTimeout(() => {
      router.push("/");
    }, 800);
  };

  const currentResident = findMember(selectedBlock, selectedFlat);
  const isCurrentlyOccupied = Boolean(currentResident?.name || currentResident?.phone);

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 pt-1">
        <Link
          href="/"
          className="p-1.5 rounded-full hover:bg-slate-200 text-slate-600 transition"
          aria-label="Back to Directory"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">
            {isCurrentlyOccupied ? "Update Resident" : "Add Resident"}
          </h1>
          <p className="text-xs text-slate-500">
            Block {selectedBlock} • Flat {selectedFlat}
          </p>
        </div>
      </div>

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        {error && (
          <div className="flex items-center gap-2 bg-rose-50 text-rose-700 p-2.5 rounded-xl text-xs font-semibold border border-rose-100">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 p-2.5 rounded-xl text-xs font-semibold border border-emerald-100">
            <Check className="w-4 h-4 shrink-0" />
            <span>Saved successfully! Redirecting...</span>
          </div>
        )}

        {/* 1. Select Block */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            1. Select Block
          </label>
          <div className="grid grid-cols-4 gap-2">
            {["A", "B", "C", "D"].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setSelectedBlock(b)}
                className={`py-2.5 text-center rounded-xl border text-sm font-bold transition ${
                  selectedBlock === b
                    ? "bg-teal-700 text-white border-teal-700 shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                Block {b}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Select Flat Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            2. Select Flat Number
          </label>
          <select
            value={selectedFlat}
            onChange={(e) => setSelectedFlat(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-xs"
          >
            {blockFlats.map((m) => {
              const occupied = Boolean(m.name || m.phone);
              return (
                <option key={m.id} value={m.flatNo}>
                  Flat {m.flatNo} {occupied ? `• ${m.name}` : "(Vacant)"}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            {isCurrentlyOccupied ? (
              <span className="text-teal-700 font-semibold">
                ● Currently registered to {currentResident?.name}. You can update details below.
              </span>
            ) : (
              <span className="text-slate-400">● Flat is currently vacant.</span>
            )}
          </p>
        </div>

        {/* 3. Resident Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            3. Resident Name <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Patel"
            required
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-xs"
          />
        </div>

        {/* 4. Mobile Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            4. Mobile Number
          </label>
          <div className="flex items-center">
            <span className="inline-flex items-center px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-100 border border-r-0 border-slate-200 rounded-l-xl">
              +91
            </span>
            <input
              type="tel"
              inputMode="numeric"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              placeholder="98765 43210"
              maxLength={10}
              className="w-full bg-white border border-slate-200 rounded-r-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-xs"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">10-digit number for calling and WhatsApp</p>
        </div>

        {/* 5. Additional Details */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            5. Additional Details <span className="text-slate-400 normal-case font-normal">(Optional)</span>
          </label>
          <textarea
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="e.g. Car No: GJ-01-XX-1234, Alternate contact, or notes..."
            rows={2}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:ring-1 focus:ring-teal-600 shadow-xs"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={success}
            className="w-full py-3 px-4 bg-teal-700 hover:bg-teal-800 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition shadow-sm active:scale-98"
          >
            {success ? "Saved!" : isCurrentlyOccupied ? "Update Resident Details" : "Save Resident"}
          </button>

          <Link
            href="/"
            className="block w-full py-2.5 text-center text-xs font-semibold text-slate-500 hover:text-slate-700 mt-2"
          >
            Cancel & Return to Directory
          </Link>
        </div>
      </form>
    </div>
  );
}

export default function AddPage() {
  return (
    <Suspense fallback={<div className="p-4 text-xs text-slate-400">Loading form...</div>}>
      <AddResidentForm />
    </Suspense>
  );
}
