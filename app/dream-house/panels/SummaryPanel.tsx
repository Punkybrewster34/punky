'use client';

import React from 'react';
import type { CostBreakdown, Project } from '../types';
import {
  EXTERIOR_MAP,
  FEATURE_MAP,
  FINISH_MAPS,
  QUALITY_MAP,
  ROOF_MAP,
  ROOM_TYPE_MAP,
  STYLE_MAP,
} from '../catalog';
import { formatCurrency, roomArea } from '../costing';
import { Button, Card, SectionTitle } from '../ui';

export function SummaryPanel({
  project,
  cost,
  isPro,
  update,
  onExport,
}: {
  project: Project;
  cost: CostBreakdown;
  isPro: boolean;
  update: (patch: Partial<Project>) => void;
  onExport: () => void;
}) {
  const quality = QUALITY_MAP[project.qualityTier];
  const style = STYLE_MAP[project.style];

  const roomsByFloor = new Map<number, Project['rooms']>();
  for (const r of project.rooms) {
    if (!roomsByFloor.has(r.floor)) roomsByFloor.set(r.floor, []);
    roomsByFloor.get(r.floor)!.push(r);
  }

  const beds = project.rooms.filter((r) =>
    ['master', 'bedroom', 'nursery'].includes(r.type),
  ).length;
  const baths =
    project.rooms.filter((r) => ['fullbath', 'ensuite'].includes(r.type)).length +
    0.5 * project.rooms.filter((r) => r.type === 'halfbath').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <SectionTitle title="Your dream home spec sheet" subtitle="Review, print, or share your plan." />
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onExport}>
            🖨️ Print / Save PDF{!isPro && ' 🔒'}
          </Button>
        </div>
      </div>

      <div id="dh-spec-sheet">
        <Card className="overflow-hidden">
          <div className="border-b border-slate-100 bg-gradient-to-br from-slate-800 to-slate-900 px-8 py-7 text-white">
            <div className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              DreamHaus · Project Spec Sheet
            </div>
            <h1 className="mt-1 text-3xl font-bold">{project.name}</h1>
            <p className="mt-1 text-slate-300">
              {project.location || 'Location TBD'} · {style?.label} · {quality?.label}
            </p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SpecStat label="Living area" value={`${cost.totalSqFt.toLocaleString()} sf`} />
              <SpecStat label="Bed / Bath" value={`${beds} bd · ${baths} ba`} />
              <SpecStat label="Estimated cost" value={formatCurrency(cost.grandTotal)} />
              <SpecStat
                label="Cost / sqft"
                value={cost.totalSqFt ? formatCurrency(cost.costPerSqFt) : '—'}
              />
            </div>
          </div>

          <div className="grid gap-8 px-8 py-7 sm:grid-cols-2">
            <div>
              <SheetHeading>Build specification</SheetHeading>
              <SpecRow label="Architectural style" value={style?.label ?? '—'} />
              <SpecRow label="Build quality" value={quality?.label ?? '—'} />
              <SpecRow label="Stories" value={String(project.stories)} />
              <SpecRow label="Lot" value={`${project.lotWidth}′ × ${project.lotDepth}′`} />
              <SpecRow label="Exterior" value={EXTERIOR_MAP[project.exterior]?.label ?? '—'} />
              <SpecRow label="Roofing" value={ROOF_MAP[project.roof]?.label ?? '—'} />
              <SpecRow label="Flooring" value={FINISH_MAPS.flooring[project.finishes.flooring]?.label ?? '—'} />
              <SpecRow label="Countertops" value={FINISH_MAPS.countertop[project.finishes.countertop]?.label ?? '—'} />
              <SpecRow label="Cabinetry" value={FINISH_MAPS.cabinets[project.finishes.cabinets]?.label ?? '—'} />
            </div>

            <div>
              <SheetHeading>Cost summary</SheetHeading>
              <SpecRow label="Hard costs" value={formatCurrency(cost.hardCosts)} />
              <SpecRow label="Soft costs" value={formatCurrency(cost.softCosts)} />
              <SpecRow
                label={`Contingency (${project.contingencyPct}%)`}
                value={formatCurrency(cost.contingency)}
              />
              <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                <span className="font-bold text-slate-900">Total estimate</span>
                <span className="font-bold text-teal-700">{formatCurrency(cost.grandTotal)}</span>
              </div>
              <SheetHeading className="mt-6">Amenities ({project.features.length})</SheetHeading>
              {project.features.length === 0 ? (
                <p className="text-sm text-slate-400">No amenities added.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {project.features.map((id) => (
                    <span
                      key={id}
                      className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                    >
                      {FEATURE_MAP[id]?.icon} {FEATURE_MAP[id]?.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-100 px-8 py-7">
            <SheetHeading>Room schedule</SheetHeading>
            {project.rooms.length === 0 ? (
              <p className="text-sm text-slate-400">No rooms added yet.</p>
            ) : (
              Array.from(roomsByFloor.keys())
                .sort()
                .map((floor) => {
                  const rooms = roomsByFloor.get(floor)!;
                  const floorSqFt = rooms.reduce((s, r) => s + roomArea(r.w, r.h), 0);
                  return (
                    <div key={floor} className="mb-4">
                      <div className="mb-1.5 text-sm font-semibold text-slate-700">
                        {floor === 0 ? 'Ground floor' : `Floor ${floor + 1}`}
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {floorSqFt.toLocaleString()} sf
                        </span>
                      </div>
                      <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
                        {rooms.map((r) => (
                          <div
                            key={r.id}
                            className="flex items-center justify-between border-b border-slate-50 py-1 text-sm"
                          >
                            <span className="text-slate-600">
                              {ROOM_TYPE_MAP[r.type]?.icon} {r.name}
                            </span>
                            <span className="text-xs text-slate-400">
                              {r.w}′ × {r.h}′ · {roomArea(r.w, r.h)} sf
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <div className="border-t border-slate-100 px-8 py-4 text-center text-xs text-slate-400">
            Estimate generated by DreamHaus on {new Date().toLocaleDateString()}. Figures are
            planning ballparks — confirm with a licensed builder before committing.
          </div>
        </Card>
      </div>

      <Card className="p-6 print:hidden">
        <SectionTitle title="Notes" subtitle="Anything you want to remember or share with your builder." />
        <textarea
          value={project.notes}
          onChange={(e) => update({ notes: e.target.value })}
          rows={4}
          placeholder="Must-haves, inspiration, questions for the architect…"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-200"
        />
      </Card>
    </div>
  );
}

function SpecStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-0.5 text-lg font-semibold text-white">{value}</div>
    </div>
  );
}

function SheetHeading({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`mb-2 text-xs font-bold uppercase tracking-widest text-teal-600 ${className}`}>
      {children}
    </h3>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-1.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-800">{value}</span>
    </div>
  );
}
