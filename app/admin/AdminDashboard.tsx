'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { AppData, Cleaner, AppSettings, Availability } from '@/lib/data';
import type { ScheduleWeek, ScheduleDay } from '@/lib/dates';

type Tab = 'schedules' | 'cleaners' | 'settings';

interface Props {
  initialData: AppData;
  weeks: ScheduleWeek[];
  siteUrl: string;
}

const AVAIL_CELL: Record<string, string> = {
  available: 'bg-green-500 text-white',
  'morning-only': 'bg-amber-400 text-white',
  'afternoon-only': 'bg-yellow-300 text-gray-800',
  'not-available': 'bg-red-500 text-white',
};
const AVAIL_LABEL: Record<string, string> = {
  available: 'Full Day',
  'morning-only': 'AM',
  'afternoon-only': 'PM',
  'not-available': '✕',
};

export default function AdminDashboard({ initialData, weeks, siteUrl }: Props) {
  const [tab, setTab] = useState<Tab>('schedules');
  const [data, setData] = useState<AppData>(initialData);
  const [weekIdx, setWeekIdx] = useState(0);
  const router = useRouter();

  const refresh = useCallback(async () => {
    const res = await fetch('/api/admin/schedules');
    if (res.ok) {
      const json = await res.json() as AppData;
      setData(json);
    }
  }, []);

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.refresh();
  }

  const currentWeek = weeks[weekIdx];
  const activeCleaners = data.cleaners.filter((c) => c.active);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-teal-700 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">{data.settings.businessName}</h1>
            <p className="text-teal-200 text-xs mt-0.5">Admin Panel</p>
          </div>
          <button
            onClick={handleLogout}
            className="text-teal-200 hover:text-white text-sm font-medium transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4">
          <nav className="flex gap-1">
            {(['schedules', 'cleaners', 'settings'] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-3 text-sm font-medium capitalize border-b-2 transition-colors ${
                  tab === t
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'schedules' ? '📅 Schedules' : t === 'cleaners' ? '👥 Cleaners' : '⚙️ Settings'}
              </button>
            ))}
          </nav>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {tab === 'schedules' && (
          <SchedulesTab
            data={data}
            weeks={weeks}
            weekIdx={weekIdx}
            setWeekIdx={setWeekIdx}
            activeCleaners={activeCleaners}
            currentWeek={currentWeek}
            onRefresh={refresh}
          />
        )}
        {tab === 'cleaners' && (
          <CleanersTab
            data={data}
            siteUrl={siteUrl}
            onRefresh={refresh}
          />
        )}
        {tab === 'settings' && (
          <SettingsTab settings={data.settings} onSaved={refresh} />
        )}
      </main>
    </div>
  );
}

// ─── Schedules Tab ────────────────────────────────────────────────────────────

function SchedulesTab({
  data,
  weeks,
  weekIdx,
  setWeekIdx,
  activeCleaners,
  currentWeek,
  onRefresh,
}: {
  data: AppData;
  weeks: ScheduleWeek[];
  weekIdx: number;
  setWeekIdx: (i: number) => void;
  activeCleaners: Cleaner[];
  currentWeek: ScheduleWeek;
  onRefresh: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Schedule Overview</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="text-sm text-teal-600 hover:text-teal-800 font-medium"
          >
            ↻ Refresh
          </button>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {weeks.map((w, i) => (
              <button
                key={i}
                onClick={() => setWeekIdx(i)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  weekIdx === i ? 'bg-teal-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Week {i + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="text-sm text-gray-500 mb-4">{currentWeek.label}</p>

      {activeCleaners.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400">
          No cleaners added yet. Go to the <strong>Cleaners</strong> tab to add someone.
        </div>
      ) : (
        <>
          {/* Grid table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto mb-6">
            <table className="w-full text-sm min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-4 py-3 font-semibold text-gray-700 w-32 bg-gray-50">
                    Cleaner
                  </th>
                  {currentWeek.days.map((day) => (
                    <th
                      key={day.dateStr}
                      className={`px-2 py-3 text-center font-medium text-xs ${
                        day.isWeekend ? 'text-gray-400 bg-gray-50/50' : 'text-gray-600'
                      }`}
                    >
                      <div>{day.dayName}</div>
                      <div className="text-gray-400 font-normal">{day.displayDate}</div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-left font-medium text-xs text-gray-500 w-48 bg-gray-50">
                    Comments
                  </th>
                </tr>
              </thead>
              <tbody>
                {activeCleaners.map((cleaner) => {
                  const sched = data.schedules[cleaner.token];
                  const avail = sched?.availability ?? {};
                  const comments = sched?.comments ?? '';
                  const lastUpdated = sched?.lastUpdated
                    ? new Date(sched.lastUpdated).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : null;
                  return (
                    <tr
                      key={cleaner.id}
                      className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors ${
                        selected === cleaner.id ? 'bg-teal-50' : 'hover:bg-gray-50/50'
                      }`}
                      onClick={() => setSelected(selected === cleaner.id ? null : cleaner.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 truncate">{cleaner.name}</div>
                        {lastUpdated && (
                          <div className="text-xs text-gray-400 mt-0.5">Updated {lastUpdated}</div>
                        )}
                      </td>
                      {currentWeek.days.map((day) => {
                        const val: Availability = avail[day.dateStr] ?? null;
                        return (
                          <td key={day.dateStr} className="px-1 py-2 text-center">
                            {val ? (
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded text-xs font-semibold ${AVAIL_CELL[val]}`}
                                title={AVAIL_LABEL[val]}
                              >
                                {AVAIL_LABEL[val]}
                              </span>
                            ) : (
                              <span className="text-gray-200 text-xs">—</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3">
                        {comments ? (
                          <span
                            className="text-xs text-gray-500 line-clamp-2 cursor-help"
                            title={comments}
                          >
                            {comments}
                          </span>
                        ) : (
                          <span className="text-gray-200 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-2 text-xs">
            {Object.entries(AVAIL_CELL).map(([k, cls]) => (
              <span key={k} className={`px-2 py-0.5 rounded font-medium ${cls}`}>
                {k === 'available' ? 'Full Day' : k === 'morning-only' ? 'Morning Only' : k === 'afternoon-only' ? 'Afternoon Only' : 'Not Available'}
              </span>
            ))}
            <span className="px-2 py-0.5 rounded text-gray-400 bg-gray-100">— Not Set</span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Cleaners Tab ─────────────────────────────────────────────────────────────

function CleanersTab({
  data,
  siteUrl,
  onRefresh,
}: {
  data: AppData;
  siteUrl: string;
  onRefresh: () => Promise<void>;
}) {
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleAdd() {
    if (!newName.trim()) return;
    setAdding(true);
    setError('');
    try {
      const res = await fetch('/api/admin/cleaners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), notes: newNotes.trim() || undefined }),
      });
      if (res.ok) {
        setNewName('');
        setNewNotes('');
        await onRefresh();
      } else {
        setError('Failed to add cleaner.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setAdding(false);
    }
  }

  function startEdit(c: Cleaner) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditNotes(c.notes ?? '');
  }

  async function saveEdit(id: string) {
    await fetch(`/api/admin/cleaners/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), notes: editNotes.trim() || undefined }),
    });
    setEditingId(null);
    await onRefresh();
  }

  async function toggleActive(c: Cleaner) {
    await fetch(`/api/admin/cleaners/${c.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !c.active }),
    });
    await onRefresh();
  }

  async function handleDelete(id: string) {
    await fetch(`/api/admin/cleaners/${id}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    await onRefresh();
  }

  function copyLink(c: Cleaner) {
    const url = `${siteUrl}/schedule/${c.token}`;
    navigator.clipboard.writeText(url);
    setCopiedId(c.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Manage Cleaners</h2>

      {/* Add form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Add New Cleaner</h3>
        <div className="flex flex-col sm:flex-row gap-2 mb-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Cleaner name *"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
          <input
            type="text"
            value={newNotes}
            onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
          />
          <button
            onClick={handleAdd}
            disabled={adding || !newName.trim()}
            className="bg-teal-700 hover:bg-teal-800 disabled:bg-gray-200 disabled:text-gray-400 text-white px-5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
          >
            {adding ? 'Adding…' : '+ Add'}
          </button>
        </div>
        {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
      </div>

      {/* Cleaner list */}
      {data.cleaners.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center text-gray-400 text-sm">
          No cleaners yet. Add one above.
        </div>
      ) : (
        <div className="space-y-2.5">
          {data.cleaners.map((c) => {
            const isEditing = editingId === c.id;
            const isConfirmDelete = confirmDeleteId === c.id;
            const link = `${siteUrl}/schedule/${c.token}`;
            const lastUpdated = data.schedules[c.token]?.lastUpdated;

            return (
              <div
                key={c.id}
                className={`bg-white rounded-xl border shadow-sm p-4 transition-all ${
                  !c.active ? 'opacity-60 border-gray-100' : 'border-gray-100'
                }`}
              >
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="Name"
                      autoFocus
                    />
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                      placeholder="Notes (optional)"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(c.id)}
                        className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="border border-gray-200 text-gray-500 hover:bg-gray-50 text-xs font-medium px-3 py-1.5 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{c.name}</span>
                        {!c.active && (
                          <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">
                            Inactive
                          </span>
                        )}
                      </div>
                      {c.notes && (
                        <p className="text-xs text-gray-400 mt-0.5">{c.notes}</p>
                      )}
                      {lastUpdated && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last updated:{' '}
                          {new Date(lastUpdated).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      )}
                      {/* Invite link */}
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-gray-400 font-mono truncate max-w-[220px]">
                          {link}
                        </span>
                        <button
                          onClick={() => copyLink(c)}
                          className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                            copiedId === c.id
                              ? 'bg-green-100 text-green-600'
                              : 'bg-teal-50 text-teal-600 hover:bg-teal-100'
                          }`}
                        >
                          {copiedId === c.id ? '✓ Copied!' : 'Copy Link'}
                        </button>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => startEdit(c)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={() => toggleActive(c)}
                        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors text-xs"
                        title={c.active ? 'Deactivate' : 'Activate'}
                      >
                        {c.active ? '⏸' : '▶'}
                      </button>
                      {isConfirmDelete ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="text-xs px-2 py-1 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600"
                          >
                            Delete
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs px-2 py-1 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(c.id)}
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          🗑
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({
  settings: initial,
  onSaved,
}: {
  settings: AppSettings;
  onSaved: () => Promise<void>;
}) {
  const [form, setForm] = useState<AppSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  function set(key: keyof AppSettings, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSaved(true);
        await onSaved();
        setTimeout(() => setSaved(false), 3000);
      } else {
        setError('Failed to save settings.');
      }
    } catch {
      setError('Connection error.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Page Settings</h2>
      <p className="text-sm text-gray-500 mb-5">
        Customize what cleaners see on their schedule page.
      </p>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-5">
        <Field
          label="Business Name"
          hint="Shown in the header on the cleaner's page."
        >
          <input
            type="text"
            value={form.businessName}
            onChange={(e) => set('businessName', e.target.value)}
            className="input"
            placeholder="Punky Cleaning"
          />
        </Field>

        <Field
          label="Welcome Message"
          hint="Greeting shown at the top of the schedule page."
        >
          <textarea
            value={form.welcomeMessage}
            onChange={(e) => set('welcomeMessage', e.target.value)}
            rows={2}
            className="input resize-none"
            placeholder="Hi! Please set your availability for the upcoming two weeks."
          />
        </Field>

        <Field
          label="Schedule Instructions"
          hint="Smaller helper text below the welcome message."
        >
          <textarea
            value={form.scheduleInstructions}
            onChange={(e) => set('scheduleInstructions', e.target.value)}
            rows={2}
            className="input resize-none"
            placeholder="Tap a button to set your availability…"
          />
        </Field>

        <Field
          label="Show Weekends"
          hint="Include Saturday and Sunday in the two-week schedule."
        >
          <label className="flex items-center gap-3 cursor-pointer">
            <div
              onClick={() => set('showWeekends', !form.showWeekends)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.showWeekends ? 'bg-teal-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.showWeekends ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-sm text-gray-600">
              {form.showWeekends ? 'Yes — show Sat & Sun' : 'No — weekdays only'}
            </span>
          </label>
        </Field>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-teal-700 hover:bg-teal-800 disabled:bg-gray-200 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Settings'}
        </button>
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-amber-800 mb-1">Admin Password</h3>
        <p className="text-xs text-amber-700 leading-relaxed">
          To change the admin password, update the <code className="bg-amber-100 px-1 rounded">ADMIN_PASSWORD</code> value in your{' '}
          <code className="bg-amber-100 px-1 rounded">.env.local</code> file and restart the server.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-0.5">{label}</label>
      <p className="text-xs text-gray-400 mb-1.5">{hint}</p>
      {children}
    </div>
  );
}

// Tailwind doesn't purge dynamic class strings, so we add a style tag approach
// instead use a regular className on inputs via globals.css
