"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, AlertCircle, Plus, Trash2, Users, Car } from "lucide-react";
import { getMembers, defaultMembers, findMember, saveMemberCloud, fetchLiveMembers, Member, FamilyMember, Vehicle } from "@/lib/storage";

export default function AddPage() {
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [selectedBlock, setSelectedBlock] = useState<string>("A");
  const [selectedFlat, setSelectedFlat] = useState<string>("101");
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [additionalDetails, setAdditionalDetails] = useState<string>("");
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [error, setError] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    // 1. Local state
    setMembers(getMembers());

    // 2. Fetch live data from cloud
    fetchLiveMembers().then((data) => {
      if (data && data.length > 0) setMembers(data);
    });

    // Read URL query parameters if navigated from a card
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const blockParam = params.get("block")?.toUpperCase();
      const flatParam = params.get("flat");

      if (blockParam && ["A", "B", "C", "D"].includes(blockParam)) {
        setSelectedBlock(blockParam);
      }
      if (flatParam) {
        setSelectedFlat(flatParam);
      }
    }
  }, []);

  // When block changes, update flat selector
  const blockFlats = members.filter((m) => m.block === selectedBlock);

  // Sync form when flat selection or block changes
  useEffect(() => {
    if (!selectedBlock || !selectedFlat) return;
    const existing = findMember(selectedBlock, selectedFlat, members);
    if (
      existing &&
      (existing.name ||
        existing.phone ||
        (existing.familyMembers && existing.familyMembers.length > 0) ||
        (existing.vehicles && existing.vehicles.length > 0))
    ) {
      setName(existing.name || "");
      setPhone(existing.phone || "");
      setAdditionalDetails(existing.additionalDetails || "");
      setFamilyMembers(Array.isArray(existing.familyMembers) ? [...existing.familyMembers] : []);
      setVehicles(Array.isArray(existing.vehicles) ? [...existing.vehicles] : []);
    } else {
      setName("");
      setPhone("");
      setAdditionalDetails("");
      setFamilyMembers([]);
      setVehicles([]);
    }
  }, [selectedBlock, selectedFlat, members]);

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setPhone(clean);
  };

  const handleAddFamilyMember = () => {
    setFamilyMembers([
      ...familyMembers,
      { name: "", phone: "", relation: "Spouse" },
    ]);
  };

  const handleUpdateFamilyMember = (index: number, field: keyof FamilyMember, val: string) => {
    const updated = [...familyMembers];
    if (field === "phone") {
      updated[index][field] = val.replace(/\D/g, "").slice(0, 10);
    } else {
      updated[index][field] = val;
    }
    setFamilyMembers(updated);
  };

  const handleRemoveFamilyMember = (index: number) => {
    setFamilyMembers(familyMembers.filter((_, i) => i !== index));
  };

  const handleAddVehicle = () => {
    if (vehicles.length >= 4) return;
    setVehicles([
      ...vehicles,
      { regNo: "", type: "Car" },
    ]);
  };

  const handleUpdateVehicle = (index: number, field: keyof Vehicle, val: string) => {
    const updated = [...vehicles];
    if (field === "regNo") {
      updated[index][field] = val.toUpperCase().slice(0, 20);
    } else {
      updated[index][field] = val as "Car" | "Bike" | "Other";
    }
    setVehicles(updated);
  };

  const handleRemoveVehicle = (index: number) => {
    setVehicles(vehicles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter resident name");
      return;
    }

    if (phone && phone.trim().length !== 10) {
      setError("Please enter a valid 10-digit mobile number for primary resident");
      return;
    }

    // Validate family members
    for (let i = 0; i < familyMembers.length; i++) {
      const f = familyMembers[i];
      if (f.phone && f.phone.length !== 10) {
        setError(`Please enter a valid 10-digit number for family member "${f.name || `#${i + 1}`}"`);
        return;
      }
    }

    // Sanitize and cap vehicles at 4
    const validVehicles = vehicles
      .slice(0, 4)
      .map((v) => ({
        regNo: v.regNo.trim().toUpperCase(),
        type: v.type || "Car",
      }))
      .filter((v) => v.regNo.length > 0);

    setIsSaving(true);

    try {
      await saveMemberCloud({
        block: selectedBlock,
        flatNo: selectedFlat,
        name: name.trim(),
        phone: phone.trim(),
        additionalDetails: additionalDetails.trim(),
        familyMembers,
        vehicles: validVehicles,
      });

      setSuccess(true);
      setTimeout(() => {
        router.refresh();
        router.push("/");
      }, 400);
    } catch (err) {
      console.error(err);
      setError("Could not save details to cloud. Please try again.");
      setIsSaving(false);
    }
  };

  const currentResident = findMember(selectedBlock, selectedFlat);
  const isCurrentlyOccupied = Boolean(
    currentResident?.name ||
      currentResident?.phone ||
      (currentResident?.familyMembers && currentResident.familyMembers.length > 0) ||
      (currentResident?.vehicles && currentResident.vehicles.length > 0)
  );

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
            <span>Saved successfully! Redirecting to directory...</span>
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
                    ? "bg-red-700 text-white border-red-700 shadow-xs"
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
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
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
              <span className="text-red-700 font-semibold">
                ● Currently registered to {currentResident?.name || "Resident"}. You can update details below.
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
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
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
              className="w-full bg-white border border-slate-200 rounded-r-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">10-digit number for calling and WhatsApp</p>
        </div>

        {/* 5. Family Members / Secondary Contacts */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-red-700" />
              <span>5. Family Members</span>
              <span className="text-slate-400 normal-case font-normal">(Optional)</span>
            </label>
            <button
              type="button"
              onClick={handleAddFamilyMember}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Member</span>
            </button>
          </div>

          {familyMembers.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">No family members added yet.</p>
              <button
                type="button"
                onClick={handleAddFamilyMember}
                className="mt-1 text-xs font-semibold text-red-700 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add spouse, child, or parent contact</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {familyMembers.map((f, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Family Member #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFamilyMember(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition"
                      title="Remove this member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Name */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={f.name}
                        onChange={(e) =>
                          handleUpdateFamilyMember(idx, "name", e.target.value)
                        }
                        placeholder="e.g. Geetaben Patel"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
                      />
                    </div>

                    {/* Relation */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Relation
                      </label>
                      <select
                        value={f.relation || "Spouse"}
                        onChange={(e) =>
                          handleUpdateFamilyMember(idx, "relation", e.target.value)
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
                      >
                        {["Spouse", "Son", "Daughter", "Father", "Mother", "Brother", "Sister", "Other"].map(
                          (r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Mobile Number
                    </label>
                    <div className="flex items-center">
                      <span className="inline-flex items-center px-2.5 py-2 text-xs font-semibold text-slate-500 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg">
                        +91
                      </span>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={f.phone}
                        onChange={(e) =>
                          handleUpdateFamilyMember(idx, "phone", e.target.value)
                        }
                        placeholder="98765 12345"
                        maxLength={10}
                        className="w-full bg-white border border-slate-200 rounded-r-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 6. Vehicles (Max 4 per flat) */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-red-700" />
              <span>6. Vehicles</span>
              <span className="text-slate-400 normal-case font-normal">
                ({vehicles.length}/4 max)
              </span>
            </label>
            <button
              type="button"
              onClick={handleAddVehicle}
              disabled={vehicles.length >= 4}
              className="inline-flex items-center gap-1 text-xs font-bold text-red-700 hover:text-red-800 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-lg transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vehicle</span>
            </button>
          </div>

          {vehicles.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">No vehicles added yet for this flat.</p>
              <button
                type="button"
                onClick={handleAddVehicle}
                className="mt-1 text-xs font-semibold text-red-700 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Add car, two-wheeler, or other vehicle</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {vehicles.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 border border-slate-200 rounded-xl p-3 space-y-2.5 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Vehicle #{idx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVehicle(idx)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition"
                      title="Remove this vehicle"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Vehicle Registration Number */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Registration Number
                      </label>
                      <input
                        type="text"
                        value={v.regNo}
                        onChange={(e) =>
                          handleUpdateVehicle(idx, "regNo", e.target.value)
                        }
                        placeholder="e.g. GJ-01-AB-1234"
                        maxLength={20}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm font-mono uppercase text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
                      />
                    </div>

                    {/* Vehicle Type */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Vehicle Type
                      </label>
                      <select
                        value={v.type || "Car"}
                        onChange={(e) =>
                          handleUpdateVehicle(idx, "type", e.target.value)
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
                      >
                        <option value="Car">🚗 Car / 4-Wheeler</option>
                        <option value="Bike">🛵 Two-Wheeler / Bike</option>
                        <option value="Other">🚙 Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Additional Details */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            7. Additional Details <span className="text-slate-400 normal-case font-normal">(Optional)</span>
          </label>
          <textarea
            value={additionalDetails}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="e.g. Alternate contact, intercom, or notes..."
            rows={2}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 shadow-xs"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving || success}
            className="w-full py-3 px-4 bg-red-700 hover:bg-red-800 disabled:opacity-60 text-white rounded-xl font-bold text-sm transition shadow-sm active:scale-98"
          >
            {success
              ? "Saved!"
              : isSaving
              ? "Saving to Cloud..."
              : isCurrentlyOccupied
              ? "Update Resident Details"
              : "Save Resident"}
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
