"use client";

import React from "react";
import Link from "next/link";
import { Phone, MessageCircle, Copy, X, Pencil } from "lucide-react";
import { societyConfig } from "@/config/society";

interface FamilyContact {
  name: string;
  phone: string;
  relation?: string;
}

interface PhoneActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  unit: string;
  block?: string;
  flatNo?: string;
  residentType?: string;
  ownerName?: string;
  ownerPhone?: string;
  familyMembers?: FamilyContact[];
}

export function PhoneActionModal({
  isOpen,
  onClose,
  name,
  phone,
  unit,
  block,
  flatNo,
  residentType,
  ownerName,
  ownerPhone,
  familyMembers = [],
}: PhoneActionModalProps) {
  if (!isOpen) return null;

  const validFamily = (familyMembers || []).filter((f) => Boolean(f.phone));

  const formatPhone = (p: string) => {
    const clean = p.replace(/\D/g, "").slice(-10);
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return p;
  };

  const isTenant = residentType === "Tenant";

  const allContacts = [
    ...(phone
      ? [
          {
            name: name || (isTenant ? "Tenant Resident" : "Primary Resident"),
            phone,
            relation: isTenant ? "Tenant" : "Owner / Resident",
            isPrimary: true,
          },
        ]
      : []),
    ...validFamily.map((f) => ({
      name: f.name || "Family Member",
      phone: f.phone,
      relation: f.relation || "Family",
      isPrimary: false,
    })),
    ...(isTenant && ownerPhone
      ? [
          {
            name: ownerName || "Property Owner",
            phone: ownerPhone,
            relation: "Flat Owner",
            isPrimary: false,
          },
        ]
      : []),
  ];

  if (allContacts.length === 0) return null;

  const handleCopy = (num: string) => {
    const clean = num.replace(/\D/g, "").slice(-10);
    navigator.clipboard?.writeText(clean);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity">
      <div className="w-full max-w-sm bg-white rounded-2xl p-4 sm:p-5 shadow-2xl space-y-3.5 animate-in fade-in slide-in-from-bottom duration-200 max-h-[85vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-bold text-gray-900 text-base">{unit}</h3>
              {isTenant && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                  Tenant
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 font-medium">
              {allContacts.length === 1
                ? "Contact Resident"
                : `${allContacts.length} Contacts Available`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contacts List */}
        <div className="space-y-2.5 overflow-y-auto pr-0.5">
          {allContacts.map((contact, idx) => {
            const clean = contact.phone.replace(/\D/g, "").slice(-10);
            const formatted = formatPhone(contact.phone);
            const waUrl = `https://wa.me/91${clean}?text=${encodeURIComponent(
              `Hello ${contact.name}, greeting from ${societyConfig.name} (${unit}).`
            )}`;

            const isOwnerContact = contact.relation === "Flat Owner";

            return (
              <div
                key={idx}
                className={`border rounded-xl p-3 space-y-2 ${
                  isOwnerContact
                    ? "bg-amber-50/50 border-amber-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 leading-snug">
                        {contact.name}
                      </span>
                      {contact.relation && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            isOwnerContact
                              ? "bg-amber-100 text-amber-900 border-amber-300"
                              : contact.isPrimary
                              ? "bg-teal-50 text-teal-700 border-teal-200"
                              : "bg-slate-100 text-slate-700 border-slate-200"
                          }`}
                        >
                          {contact.relation}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-500 font-mono mt-0.5 block">
                      {formatted}
                    </span>
                  </div>
                </div>

                {/* Actions for this contact */}
                <div className="grid grid-cols-3 gap-1.5 pt-0.5">
                  <a
                    href={`tel:+91${clean}`}
                    className={`flex items-center justify-center gap-1.5 py-2 px-2 text-white rounded-lg font-semibold text-xs transition active:scale-95 shadow-xs ${
                      isOwnerContact
                        ? "bg-amber-700 hover:bg-amber-800"
                        : "bg-teal-700 hover:bg-teal-800"
                    }`}
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call</span>
                  </a>

                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-lg font-semibold text-xs transition active:scale-95 shadow-xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={() => handleCopy(contact.phone)}
                    type="button"
                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 rounded-lg font-medium text-xs transition active:scale-95"
                    title="Copy phone number"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          {societyConfig.allowEdit && block && flatNo ? (
            <Link
              href={`/add?block=${block}&flat=${flatNo}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-theme-primary hover:text-theme-hover hover:underline py-1"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Edit Flat Details</span>
            </Link>
          ) : (
            <div />
          )}
          <button
            onClick={onClose}
            type="button"
            className="py-1 px-3 text-xs font-semibold text-gray-500 hover:text-gray-800 transition rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
