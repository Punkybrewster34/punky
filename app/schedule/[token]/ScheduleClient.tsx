'use client';

import { useState, useCallback, useRef } from 'react';
import type { Cleaner, CleanerSchedule, AppSettings, Availability } from '@/lib/data';
import type { ScheduleWeek } from '@/lib/dates';

interface AvailOption {
  value: Availability;
  label: string;
  emoji: string;
  idleCls: string;
  activeCls: string;
}

const OPTIONS: AvailOption[] = [
  {
    value: 'available',
    label: 'Full Day',
    emoji: '✓',
    idleCls: 'border-gray-200 bg-white text-gray-600 hover:border-green-400 hover:bg-green-50 hover:text-green-700',
    activeCls: 'border-green-500 bg-green-500 text-white shadow-sm',
  },
  {
    value: 'morning-only',
    label: 'Morning Only',
    emoji: '🌅',
    idleCls: 'border-gray-200 bg-white text-gray-600 hover:border-amber-400 hover:bg-amber-50 hover:text-amber-700',
    activeCls: 'border-amber-500 bg-amber-500 text-white shadow-sm',
  },
  {
    value: 'afternoon-only',
    label: 'Afternoon Only',
    emoji: '🌇',
    idleCls: 'border-gray-200 bg-white text-gray-600 hover:border-yellow-400 hover:bg-yellow-50 hover:text-yellow-700',
    activeCls: 'border-yellow-400 bg-yellow-400 text-gray-900 shadow-sm',
  },
  {
    value: 'not-available',
    label: 'Not Available',
    emoji: '✕',
    idleCls: 'border-gray-200 bg-white text-gray-600 hover:border-red-400 hover:bg-red-50 hover:text-red-700',
    activeCls: 'border-red-500 bg-red-500 text-white shadow-sm',
  },
];

const STATUS_BADGE: Record<string, string> = {
  available: 'bg-green-100 text-green-700',
  'morning-only': 'bg-amber-100 text-amber-700',
  'afternoon-only': 'bg-yellow-100 text-yellow-800',
  'not-available': 'bg-red-100 text-red-700',
};

interface Props {
  token: string;
  cleaner: Cleaner;
  initialSchedule: CleanerSchedule;
  weeks: ScheduleWeek[];
  settings: AppSettings;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function ScheduleClient({ token, cleaner, initialSchedule, weeks, settings }: Props) {
  const [availability, setAvailability] = useState<Record<string, Availability>>(
    initialSchedule.availability ?? {}
  );
  const [comments, setComments] = useState(initialSchedule.comments ?? '');
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flashSaved = useCallback(() => {
    setSaveStatus('saved');
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setSaveStatus('idle'), 2500);
  }, []);

  const handleDayToggle = useCallback(
    async (dateStr: string, value: Availability) => {
      const current = availability[dateStr];
      const next: Availability = current === value ? null : value;
      setAvailability((prev) => {
        const copy = { ...prev };
        if (next === null) delete copy[dateStr];
        else copy[dateStr] = next;
        return copy;
      });
      setSaveStatus('saving');
      try {
        await fetch(`/api/schedule/${token}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dateStr, availability: next }),
        });
        flashSaved();
      } catch {
        setSaveStatus('error');
      }
    },
    [availability, token, flashSaved]
  );

  const handleCommentsBlur = useCallback(async () => {
    setSaveStatus('saving');
    try {
      await fetch(`/api/schedule/${token}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments }),
      });
      flashSaved();
    } catch {
      setSaveStatus('error');
    }
  }, [comments, token, flashSaved]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-gray-50">
      {/* Header */}
      <header className="bg-teal-700 text-white shadow-md sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight">{settings.businessName}</h1>
            <p className="text-teal-200 text-xs mt-0.5">Availability Schedule</p>
          </div>
          <SaveIndicator status={saveStatus} />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5 pb-12">
        {/* Welcome card */}
        <div className="bg-white rounded-2xl shadow-sm border border-teal-100 p-5 mb-5">
          <p className="text-lg font-semibold text-gray-900">Hi, {cleaner.name}! 👋</p>
          <p className="text-gray-600 text-sm mt-1">{settings.welcomeMessage}</p>
          {settings.scheduleInstructions && (
            <p className="text-gray-400 text-xs mt-2 leading-relaxed">
              {settings.scheduleInstructions}
            </p>
          )}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-2 mb-5 px-0.5">
          {OPTIONS.map((o) => (
            <span
              key={String(o.value)}
              className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${o.activeCls}`}
            >
              <span>{o.emoji}</span>
              {o.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-400 border border-gray-200">
            — Not Set
          </span>
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <section key={wi} className="mb-6">
            <h2 className="text-xs font-bold text-teal-700 uppercase tracking-widest mb-3 px-0.5">
              {week.label}
            </h2>
            <div className="space-y-2.5">
              {week.days.map((day) => {
                const current = availability[day.dateStr] ?? null;
                return (
                  <div
                    key={day.dateStr}
                    className={`bg-white rounded-xl shadow-sm border p-3.5 transition-colors ${
                      day.isWeekend ? 'border-gray-200 bg-gray-50/60' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-baseline gap-2">
                        <span className="font-bold text-gray-800 text-sm tracking-wide">
                          {day.dayName}
                        </span>
                        <span className="text-gray-400 text-sm">{day.displayDate}</span>
                        {day.isWeekend && (
                          <span className="text-xs text-gray-300 italic">weekend</span>
                        )}
                      </div>
                      {current && (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[current]}`}
                        >
                          {OPTIONS.find((o) => o.value === current)?.label}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                      {OPTIONS.map((opt) => (
                        <button
                          key={String(opt.value)}
                          onClick={() => handleDayToggle(day.dateStr, opt.value)}
                          className={`py-2 px-1.5 rounded-lg text-xs font-semibold border transition-all duration-100 active:scale-95 select-none ${
                            current === opt.value ? opt.activeCls : opt.idleCls
                          }`}
                        >
                          <span className="mr-0.5">{opt.emoji}</span> {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* Comments */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <label htmlFor="comments" className="block text-sm font-semibold text-gray-700 mb-2">
            Additional Comments
          </label>
          <textarea
            id="comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            onBlur={handleCommentsBlur}
            placeholder="Any notes, special requests, time restrictions, or details about your availability…"
            rows={4}
            className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-300"
          />
          <p className="text-xs text-gray-300 mt-1.5">Saved automatically when you click away.</p>
        </div>
      </main>
    </div>
  );
}

function SaveIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  if (status === 'saving')
    return (
      <span className="flex items-center gap-1.5 text-teal-200 text-xs">
        <span className="w-3 h-3 border-2 border-teal-300 border-t-transparent rounded-full animate-spin" />
        Saving…
      </span>
    );
  if (status === 'saved')
    return <span className="text-green-300 text-xs font-medium">✓ Saved</span>;
  return <span className="text-red-300 text-xs">Save failed</span>;
}
