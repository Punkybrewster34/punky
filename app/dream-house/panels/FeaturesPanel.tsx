'use client';

import React from 'react';
import type { Project } from '../types';
import { FEATURES, type FeatureDef } from '../catalog';
import { Card, SectionTitle } from '../ui';
import { formatCurrency } from '../costing';

const CATEGORY_LABELS: Record<FeatureDef['category'], string> = {
  outdoor: 'Outdoor & Recreation',
  comfort: 'Comfort & Interior',
  tech: 'Technology',
  sustainability: 'Energy & Sustainability',
  structure: 'Structural',
};

const ORDER: FeatureDef['category'][] = [
  'outdoor',
  'comfort',
  'tech',
  'sustainability',
  'structure',
];

export function FeaturesPanel({
  project,
  update,
}: {
  project: Project;
  update: (patch: Partial<Project>) => void;
}) {
  const selected = new Set(project.features);
  const total = project.features.reduce(
    (s, id) => s + (FEATURES.find((f) => f.id === id)?.cost ?? 0),
    0,
  );

  function toggle(id: string) {
    const next = selected.has(id)
      ? project.features.filter((f) => f !== id)
      : [...project.features, id];
    update({ features: next });
  }

  return (
    <div className="space-y-6">
      <Card className="flex items-center justify-between p-5">
        <div>
          <div className="text-sm text-slate-500">Amenities selected</div>
          <div className="text-2xl font-bold text-slate-900">{project.features.length}</div>
        </div>
        <div className="text-right">
          <div className="text-sm text-slate-500">Added to estimate</div>
          <div className="text-2xl font-bold text-teal-600">{formatCurrency(total)}</div>
        </div>
      </Card>

      {ORDER.map((cat) => {
        const items = FEATURES.filter((f) => f.category === cat);
        return (
          <Card key={cat} className="p-6">
            <SectionTitle title={CATEGORY_LABELS[cat]} />
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((f) => {
                const active = selected.has(f.id);
                return (
                  <button
                    key={f.id}
                    onClick={() => toggle(f.id)}
                    className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition ${
                      active
                        ? 'border-teal-500 bg-teal-50 ring-1 ring-teal-200'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-2xl leading-none">{f.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-slate-800">{f.label}</span>
                        <span
                          className={`flex h-5 w-5 flex-none items-center justify-center rounded-full border text-xs ${
                            active
                              ? 'border-teal-500 bg-teal-500 text-white'
                              : 'border-slate-300 text-transparent'
                          }`}
                        >
                          ✓
                        </span>
                      </span>
                      <span className="mt-0.5 block text-xs text-slate-500">{f.blurb}</span>
                      <span className="mt-1 block text-xs font-medium text-slate-600">
                        {formatCurrency(f.cost)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
