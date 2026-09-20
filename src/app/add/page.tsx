"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, AlertCircle, Plus, Trash2, Users, Car, Home, Building } from "lucide-react";
import {
  getMembers,
  defaultMembers,
  findMember,
  saveMemberCloud,
  fetchLiveMembers,
  Member,
  FamilyMember,
  Vehicle,
} from "@/lib/storage";
import { societyConfig, isValidBlock, generateFlatsForBlock } from "@/config/society";

export default function AddPage() {
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>(defaultMembers);
  const [selectedBlock, setSelectedBlock] = useState<string>(societyConfig.defaultBlock);
  const [selectedFlat, setSelectedFlat] = useState<string>("101");
  const [name, setName] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [residentType, setResidentType] = useState<"Owner" | "Tenant">("Owner");
  const [ownerName, setOwnerName] = useState<string>("");
  const [ownerPhone, setOwnerPhone] = useState<string>("");
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

      if (blockParam && isValidBlock(blockParam)) {
        setSelectedBlock(blockParam);
      }
      if (flatParam) {
        setSelectedFlat(flatParam);
      }
    }
  }, []);

  // Dynamically compute all valid flats for the selected block (floors x flatsPerFloor)
  const blockFlats = useMemo(() => {
    const generated = generateFlatsForBlock(selectedBlock);
    const memberMap = new Map<string, Member>();
    members.forEach((m) => {
      if (m.block.toUpperCase() === selectedBlock.toUpperCase()) {
        memberMap.set(String(m.flatNo), m);
      }
    });

    return generated.map((gf) => {
      const existing = memberMap.get(gf.flatNo);
      return (
        existing || {
          id: gf.id,
          block: gf.block,
          flatNo: gf.flatNo,
          floor: gf.floor,
          name: "",
          phone: "",
          status: "Vacant" as const,
          residentType: "Owner",
          ownerName: "",
          ownerPhone: "",
          familyMembers: [],
          vehicles: [],
        }
      );
    });
  }, [selectedBlock, members]);

  // Ensure selectedFlat is valid when block changes
  useEffect(() => {
    if (blockFlats.length > 0) {
      const exists = blockFlats.some((f) => f.flatNo === selectedFlat);
      if (!exists) {
        setSelectedFlat(blockFlats[0].flatNo);
      }
    }
  }, [blockFlats, selectedFlat]);

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
      setResidentType(existing.residentType === "Tenant" ? "Tenant" : "Owner");
      setOwnerName(existing.ownerName || "");
      setOwnerPhone(existing.ownerPhone || "");
      setAdditionalDetails(existing.additionalDetails || "");
      setFamilyMembers(Array.isArray(existing.familyMembers) ? [...existing.familyMembers] : []);
      setVehicles(Array.isArray(existing.vehicles) ? [...existing.vehicles] : []);
    } else {
      setName("");
      setPhone("");
      setResidentType("Owner");
      setOwnerName("");
      setOwnerPhone("");
      setAdditionalDetails("");
      setFamilyMembers([]);
      setVehicles([]);
    }
  }, [selectedBlock, selectedFlat, members]);

  const handlePhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setPhone(clean);
  };

  const handleOwnerPhoneChange = (val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 10);
    setOwnerPhone(clean);
  };

  const handleAddFamilyMember = () => {
    if (familyMembers.length >= societyConfig.limits.maxFamilyMembersPerFlat) return;
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
    if (vehicles.length >= societyConfig.limits.maxVehiclesPerFlat) return;
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

  const currentResident = findMember(selectedBlock, selectedFlat, members);
  const isCurrentlyOccupied = Boolean(
    currentResident?.name ||
      currentResident?.phone ||
      (currentResident?.familyMembers && currentResident.familyMembers.length > 0) ||
      (currentResident?.vehicles && currentResident.vehicles.length > 0)
  );
  const isEditingBlocked = !societyConfig.allowEdit && isCurrentlyOccupied;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (isEditingBlocked) {
      setError("Editing existing flat records is disabled for this society.");
      return;
    }

    if (!name.trim()) {
      setError("Please enter resident name");
      return;
    }

    if (phone && phone.trim().length !== 10) {
      setError("Please enter a valid 10-digit mobile number for primary resident");
      return;
    }

    if (residentType === "Tenant" && ownerPhone && ownerPhone.trim().length !== 10) {
      setError("Please enter a valid 10-digit mobile number for flat owner");
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

    // Validate vehicles
    for (let i = 0; i < vehicles.length; i++) {
      const v = vehicles[i];
      if (v.regNo && v.regNo.trim().length < 3) {
        setError(`Please enter a valid registration number for vehicle #${i + 1}`);
        return;
      }
    }

    setIsSaving(true);

    try {
      saveMemberCloud({
        block: selectedBlock,
        flatNo: selectedFlat,
        name: name.trim(),
        phone: phone.trim(),
        residentType,
        ownerName: residentType === "Tenant" ? ownerName.trim() : "",
        ownerPhone: residentType === "Tenant" ? ownerPhone.trim() : "",
        additionalDetails: additionalDetails.trim(),
        familyMembers,
        vehicles,
      });

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 1200);
    } catch {
      setError("Something went wrong while saving. Please try again.");
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3 pt-2">
        <Link
          href="/"
          className="p-2 -ml-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            {isEditingBlocked
              ? "Resident Details (Read Only)"
              : isCurrentlyOccupied
              ? `Update Flat ${selectedBlock}-${selectedFlat}`
              : "Add Resident Details"}
          </h1>
          <p className="text-xs text-slate-500">
            {societyConfig.name} • Block {selectedBlock} Flat {selectedFlat}
          </p>
        </div>
      </div>

      {/* Editing Disabled Warning Banner */}
      {isEditingBlocked && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Editing is disabled for registered flats.</span>
            <p className="mt-0.5 text-amber-700">
              Details for flat {selectedBlock}-{selectedFlat} have already been submitted. Overwriting existing entries is restricted for this society.
            </p>
          </div>
        </div>
      )}

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4"
      >
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-700 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Saved successfully! Redirecting to directory...</span>
          </div>
        )}

        {/* 1. Select Block */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            1. Select Block
          </label>
          <div className="flex flex-wrap gap-2">
            {societyConfig.blocks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setSelectedBlock(b.id)}
                className={`py-2 px-3.5 text-center rounded-xl border text-sm font-bold transition ${
                  selectedBlock === b.id
                    ? "bg-theme-primary text-white border-theme-primary shadow-xs"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {b.name}
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
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-sm font-medium text-slate-900 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs"
          >
            {blockFlats.map((m) => {
              const occupied = Boolean(m.name || m.phone);
              const typeLabel = m.residentType === "Tenant" ? "Tenant" : "Owner";
              return (
                <option key={m.id} value={m.flatNo}>
                  Flat {m.flatNo} {occupied ? `• ${m.name} (${typeLabel})` : "(Vacant)"}
                </option>
              );
            })}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            {isCurrentlyOccupied ? (
              <span className={isEditingBlocked ? "text-amber-700 font-semibold" : "text-theme-primary font-semibold"}>
                ● Currently registered to {currentResident?.name || "Resident"} ({currentResident?.residentType || "Owner"}).{" "}
                {isEditingBlocked ? "Editing is disabled for this society." : "You can update details below."}
              </span>
            ) : (
              <span className="text-slate-400">● Flat is currently vacant.</span>
            )}
          </p>
        </div>

        {/* 3. Resident Classification (Owner vs Tenant) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            3. Resident Type
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={isEditingBlocked}
              onClick={() => setResidentType("Owner")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition ${
                residentType === "Owner"
                  ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <Home className="w-4 h-4" />
              <span>Owner</span>
            </button>
            <button
              type="button"
              disabled={isEditingBlocked}
              onClick={() => setResidentType("Tenant")}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition ${
                residentType === "Tenant"
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
              } disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              <Building className="w-4 h-4" />
              <span>Tenant (Rent)</span>
            </button>
          </div>
        </div>

        {/* Conditional Flat Owner Details (Shown when Tenant) */}
        {residentType === "Tenant" && (
          <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 uppercase tracking-wide">
              <Building className="w-3.5 h-3.5 text-amber-700" />
              <span>Flat Owner Information</span>
            </div>
            <p className="text-[11px] text-amber-800">
              Provide the flat owner&apos;s contact details for society records, maintenance, and emergency outreach.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Owner Full Name
                </label>
                <input
                  type="text"
                  value={ownerName}
                  onChange={(e) => setOwnerName(e.target.value)}
                  placeholder="e.g. Arvindbhai Shah"
                  disabled={isEditingBlocked}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Owner Mobile Number
                </label>
                <div className="flex items-center">
                  <span className="inline-flex items-center px-2.5 py-2 text-xs font-semibold text-slate-500 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={ownerPhone}
                    onChange={(e) => handleOwnerPhoneChange(e.target.value)}
                    placeholder="98250 12345"
                    maxLength={10}
                    disabled={isEditingBlocked}
                    className="w-full bg-white border border-slate-200 rounded-r-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600 shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Primary Resident Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            4. {residentType === "Tenant" ? "Tenant / Resident Name" : "Resident Name"}{" "}
            <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Ramesh Patel"
            required
            disabled={isEditingBlocked}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* 5. Mobile Number */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            5. {residentType === "Tenant" ? "Tenant Mobile Number" : "Mobile Number"}
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
              disabled={isEditingBlocked}
              className="w-full bg-white border border-slate-200 rounded-r-xl px-3.5 py-2.5 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">10-digit number for calling and WhatsApp</p>
        </div>

        {/* 6. Family Members / Secondary Contacts */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-theme-primary" />
              <span>6. Family Members</span>
              <span className="text-slate-400 normal-case font-normal">(Optional)</span>
            </label>
            {!isEditingBlocked && (
              <button
                type="button"
                onClick={handleAddFamilyMember}
                disabled={familyMembers.length >= societyConfig.limits.maxFamilyMembersPerFlat}
                className="inline-flex items-center gap-1 text-xs font-bold text-theme-primary hover:text-theme-hover bg-theme-light hover:bg-theme-light-hover disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {familyMembers.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">No family members added yet.</p>
              {!isEditingBlocked && (
                <button
                  type="button"
                  onClick={handleAddFamilyMember}
                  className="mt-1 text-xs font-semibold text-theme-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add spouse, child, or parent contact</span>
                </button>
              )}
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
                    {!isEditingBlocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveFamilyMember(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition"
                        title="Remove this member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                        disabled={isEditingBlocked}
                        onChange={(e) =>
                          handleUpdateFamilyMember(idx, "name", e.target.value)
                        }
                        placeholder="e.g. Geetaben Patel"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    {/* Relation */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Relation
                      </label>
                      <select
                        value={f.relation || "Spouse"}
                        disabled={isEditingBlocked}
                        onChange={(e) =>
                          handleUpdateFamilyMember(idx, "relation", e.target.value)
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
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
                        disabled={isEditingBlocked}
                        onChange={(e) =>
                          handleUpdateFamilyMember(idx, "phone", e.target.value)
                        }
                        placeholder="98765 43210"
                        maxLength={10}
                        className="w-full bg-white border border-slate-200 rounded-r-lg px-3 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 7. Vehicles Registration */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-theme-primary" />
              <span>7. Vehicles</span>
              <span className="text-slate-400 normal-case font-normal">
                (Max {societyConfig.limits.maxVehiclesPerFlat})
              </span>
            </label>
            {!isEditingBlocked && (
              <button
                type="button"
                onClick={handleAddVehicle}
                disabled={vehicles.length >= societyConfig.limits.maxVehiclesPerFlat}
                className="inline-flex items-center gap-1 text-xs font-bold text-theme-primary hover:text-theme-hover bg-theme-light hover:bg-theme-light-hover disabled:opacity-40 disabled:cursor-not-allowed px-2.5 py-1 rounded-lg transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {vehicles.length >= societyConfig.limits.maxVehiclesPerFlat
                    ? `(${societyConfig.limits.maxVehiclesPerFlat}/${societyConfig.limits.maxVehiclesPerFlat} max)`
                    : "Add Vehicle"}
                </span>
              </button>
            )}
          </div>

          {vehicles.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-3 text-center">
              <p className="text-xs text-slate-500">No vehicles registered for this flat.</p>
              {!isEditingBlocked && (
                <button
                  type="button"
                  onClick={handleAddVehicle}
                  className="mt-1 text-xs font-semibold text-theme-primary hover:underline inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>Register a Car, 2-Wheeler, or Other vehicle</span>
                </button>
              )}
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
                    {!isEditingBlocked && (
                      <button
                        type="button"
                        onClick={() => handleRemoveVehicle(idx)}
                        className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition"
                        title="Remove this vehicle"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* Plate Registration Number */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Plate / Reg Number
                      </label>
                      <input
                        type="text"
                        value={v.regNo}
                        disabled={isEditingBlocked}
                        onChange={(e) =>
                          handleUpdateVehicle(idx, "regNo", e.target.value)
                        }
                        placeholder="e.g. GJ-01-AB-1234"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 uppercase font-mono placeholder:text-slate-400 placeholder:normal-case focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    {/* Vehicle Type */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Vehicle Type
                      </label>
                      <select
                        value={v.type || "Car"}
                        disabled={isEditingBlocked}
                        onChange={(e) =>
                          handleUpdateVehicle(idx, "type", e.target.value)
                        }
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
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

        {/* 8. Additional Details */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
            8. Additional Details <span className="text-slate-400 normal-case font-normal">(Optional)</span>
          </label>
          <textarea
            value={additionalDetails}
            disabled={isEditingBlocked}
            onChange={(e) => setAdditionalDetails(e.target.value)}
            placeholder="e.g. Alternate contact, intercom, or notes..."
            rows={2}
            className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2 text-base sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-theme-primary focus:ring-1 focus:ring-theme-primary shadow-xs disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {/* Submit */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving || success || isEditingBlocked}
            className="w-full py-3 px-4 bg-theme-primary hover:bg-theme-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition shadow-sm active:scale-98"
          >
            {success
              ? "Saved!"
              : isSaving
              ? "Saving to Cloud..."
              : isEditingBlocked
              ? "Editing Disabled for Registered Flats"
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
