'use client';

import React from 'react';
import { Button } from './ui';

const PRO_PERKS = [
  'Unlimited rooms & multi-story homes',
  'Luxury custom build tier & all premium finishes',
  'Save unlimited projects and compare plans',
  'Export a polished PDF spec sheet & cost report',
  'Share a read-only plan link with your builder',
  'Priority access to new room types & materials',
];

export function UpgradeModal({
  open,
  reason,
  onClose,
  onUpgrade,
}: {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onUpgrade: () => void;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-5 text-white">
          <div className="text-xs font-bold uppercase tracking-widest opacity-90">
            DreamHaus Pro
          </div>
          <h3 className="mt-1 text-2xl font-bold">Design without limits</h3>
          {reason && <p className="mt-1 text-sm text-amber-50">{reason}</p>}
        </div>

        <div className="px-6 py-5">
          <ul className="space-y-2.5">
            {PRO_PERKS.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5 text-sm text-slate-700">
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700">
                  ✓
                </span>
                {perk}
              </li>
            ))}
          </ul>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border-2 border-slate-200 p-4 text-center">
              <div className="text-sm font-medium text-slate-500">Monthly</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">
                $12<span className="text-base font-normal text-slate-400">/mo</span>
              </div>
              <div className="text-xs text-slate-400">Cancel anytime</div>
            </div>
            <div className="relative rounded-xl border-2 border-amber-400 p-4 text-center">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                Best value
              </div>
              <div className="text-sm font-medium text-slate-500">Lifetime</div>
              <div className="mt-1 text-2xl font-bold text-slate-900">$99</div>
              <div className="text-xs text-slate-400">One-time, yours forever</div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <Button onClick={onUpgrade} className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              Unlock Pro
            </Button>
            <button
              onClick={onClose}
              className="w-full rounded-lg py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Maybe later
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            Demo build — &ldquo;Unlock Pro&rdquo; activates Pro features instantly on this device so
            you can explore everything. Wire it to your payment processor to go live.
          </p>
        </div>
      </div>
    </div>
  );
}
