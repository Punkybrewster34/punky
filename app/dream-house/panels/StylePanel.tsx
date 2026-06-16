'use client';

import React from 'react';
import type { Project } from '../types';
import {
  CABINETS,
  COUNTERTOPS,
  EXTERIORS,
  FLOORING,
  ROOFS,
  STYLES,
  type MaterialDef,
} from '../catalog';
import { Card, SectionTitle } from '../ui';

function ChoiceGrid({
  options,
  value,
  onPick,
  suffix = '/sf',
}: {
  options: { id: string; label: string; blurb: string; perSqFt?: number; multiplier?: number }[];
  value: string;
  onPick: (id: string) => void;
  suffix?: string;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((o) => {
        const active = o.id === value;
        const price =
          o.perSqFt !== undefined
            ? `+$${o.perSqFt}${suffix}`
            : o.multiplier !== undefined
              ? `×${o.multiplier.toFixed(2)}`
              : '';
        return (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className={`rounded-xl border-2 p-3 text-left transition ${
              active
                ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800">{o.label}</span>
              {price && (
                <span className={`text-xs font-medium ${active ? 'text-teal-700' : 'text-slate-400'}`}>
                  {price}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">{o.blurb}</p>
          </button>
        );
      })}
    </div>
  );
}

export function StylePanel({
  project,
  update,
}: {
  project: Project;
  update: (patch: Partial<Project>) => void;
}) {
  const matOpts = (arr: MaterialDef[]) =>
    arr.map((m) => ({ id: m.id, label: m.label, blurb: m.blurb, perSqFt: m.perSqFt }));

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <SectionTitle
          title="Architectural style"
          subtitle="Sets the look of your home and nudges the structural cost."
        />
        <ChoiceGrid
          options={STYLES.map((s) => ({
            id: s.id,
            label: s.label,
            blurb: s.blurb,
            multiplier: s.multiplier,
          }))}
          value={project.style}
          onPick={(style) => update({ style })}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <SectionTitle title="Exterior cladding" />
          <ChoiceGrid
            options={matOpts(EXTERIORS)}
            value={project.exterior}
            onPick={(exterior) => update({ exterior })}
          />
        </Card>
        <Card className="p-6">
          <SectionTitle title="Roofing" />
          <ChoiceGrid options={matOpts(ROOFS)} value={project.roof} onPick={(roof) => update({ roof })} />
        </Card>
      </div>

      <Card className="p-6">
        <SectionTitle title="Interior finishes" subtitle="Applied across your finished square footage." />
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Flooring</div>
            <ChoiceGrid
              options={matOpts(FLOORING)}
              value={project.finishes.flooring}
              onPick={(flooring) => update({ finishes: { ...project.finishes, flooring } })}
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Countertops</div>
            <ChoiceGrid
              options={matOpts(COUNTERTOPS)}
              value={project.finishes.countertop}
              onPick={(countertop) => update({ finishes: { ...project.finishes, countertop } })}
            />
          </div>
          <div>
            <div className="mb-2 text-sm font-semibold text-slate-700">Cabinetry</div>
            <ChoiceGrid
              options={matOpts(CABINETS)}
              value={project.finishes.cabinets}
              onPick={(cabinets) => update({ finishes: { ...project.finishes, cabinets } })}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
