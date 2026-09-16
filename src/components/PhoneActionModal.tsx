"use client";

import React from "react";
import { Phone, MessageCircle, Copy, X } from "lucide-react";

interface PhoneActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  phone: string;
  unit: string;
}

export function PhoneActionModal({
  isOpen,
  onClose,
  name,
  phone,
  unit,
}: PhoneActionModalProps) {
  if (!isOpen || !phone) return null;

  const cleanPhone = phone.replace(/\D/g, "").slice(-10);
  const formattedPhone = `+91 ${cleanPhone.slice(0, 5)} ${cleanPhone.slice(5)}`;
  const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(
    `Hello ${name || "Resident"}, greeting from Ganesh Heritage (${unit}).`
  )}`;

  const handleCopy = () => {
    navigator.clipboard?.writeText(cleanPhone);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4 transition-opacity">
      <div className="w-full max-w-sm bg-white rounded-2xl p-5 shadow-2xl space-y-4 animate-in fade-in slide-in-from-bottom duration-200">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="font-bold text-gray-900 text-base">{name || "Resident"}</h3>
            <p className="text-xs text-gray-500 font-medium">
              {unit} • {formattedPhone}
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

        <div className="grid grid-cols-1 gap-2.5 pt-1">
          {/* Direct Call */}
          <a
            href={`tel:+91${cleanPhone}`}
            className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-teal-50 text-teal-800 hover:bg-teal-100 rounded-xl font-semibold text-sm transition"
          >
            <Phone className="w-4 h-4 text-teal-600" />
            <span>Call {formattedPhone}</span>
          </a>

          {/* WhatsApp */}
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2.5 w-full py-3 px-4 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 rounded-xl font-semibold text-sm transition"
          >
            <MessageCircle className="w-4 h-4 text-emerald-600" />
            <span>Message on WhatsApp</span>
          </a>

          {/* Copy Phone Number */}
          <button
            onClick={handleCopy}
            type="button"
            className="flex items-center justify-center gap-2.5 w-full py-2.5 px-4 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-xl font-medium text-sm transition"
          >
            <Copy className="w-4 h-4 text-gray-500" />
            <span>Copy Number</span>
          </button>
        </div>

        <button
          onClick={onClose}
          type="button"
          className="w-full py-2.5 text-center text-xs font-semibold text-gray-500 hover:text-gray-800 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
