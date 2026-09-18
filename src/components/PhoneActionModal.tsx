"use client";

import React from "react";
import { Phone, MessageCircle, Copy, X } from "lucide-react";

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
  familyMembers?: FamilyContact[];
}

export function PhoneActionModal({
  isOpen,
  onClose,
  name,
  phone,
  unit,
  familyMembers = [],
}: PhoneActionModalProps) {
  if (!isOpen) return null;

  const validFamily = (familyMembers || []).filter((f) => Boolean(f.phone));
  const hasMultiple = validFamily.length > 0;

  const formatPhone = (p: string) => {
    const clean = p.replace(/\D/g, "").slice(-10);
    if (clean.length === 10) {
      return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
    }
    return p;
  };

  const allContacts = [
    ...(phone
      ? [
          {
            name: name || "Primary Resident",
            phone,
            relation: "Primary",
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
            <h3 className="font-bold text-gray-900 text-base">{unit}</h3>
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
              `Hello ${contact.name}, greeting from Ganesh Heritage (${unit}).`
            )}`;

            return (
              <div
                key={idx}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2"
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
                            contact.isPrimary
                              ? "bg-teal-50 text-teal-700 border-teal-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
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
                    className="flex items-center justify-center gap-1.5 py-2 px-2 bg-teal-700 text-white hover:bg-teal-800 rounded-lg font-semibold text-xs transition active:scale-95 shadow-xs"
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

        <button
          onClick={onClose}
          type="button"
          className="w-full py-2 text-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition pt-1"
        >
          Close
        </button>
      </div>
    </div>
  );
}
