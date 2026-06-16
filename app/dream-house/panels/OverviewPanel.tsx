'use client';

import React from 'react';
import type { CostBreakdown, Project } from '../types';
import { Card, Field, NumberInput, Select, Stat, TextInput, SectionTitle } from '../ui';
import { QUALITY_TIERS } from '../catalog';
import { formatCurrency } from '../costing';

export function OverviewPanel({
  project,
  cost,
  isPro,
  update,
  requirePro,
  goToPlan,
}: {
  project: Project;
  cost: CostBreakdown;
  isPro: boolean;
  update: (patch: Partial<Project>) => void;
  requirePro: (reason: string) => void;
  goToPlan: () => void;
}) {
  const overBudget = cost.grandTotal > project.budget && project.budget > 0;
  const pct = project.budget > 0 ? Math.min(100, (cost.grandTotal / project.budget) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-teal-600 to-emerald-600 px-6 py-8 text-white">
          <div className="text-xs font-semibold uppercase tracking-widest text-teal-100">
            Project workspace
          </div>
          <input
            value={project.name}
            onChange={(e) => update({ name: e.target.value })}
            className="mt-1 w-full bg-transparent text-3xl font-bold text-white placeholder-teal-200 focus:outline-none"
            placeholder="Name your dream home"
          />
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Stat label="Living area" value={`${cost.totalSqFt.toLocaleString()} sf`} accent="text-white" />
            <Stat label="Rooms" value={`${project.rooms.length}`} accent="text-white" />
            <Stat label="Est. cost" value={formatCurrency(cost.grandTotal)} accent="text-white" />
            <Stat
              label="$/sqft"
              value={cost.totalSqFt ? formatCurrency(cost.costPerSqFt) : '—'}
              accent="text-white"
            />
          </div>
        </div>
        <div className="px-6 py-4">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Budget</span>
            <span className={overBudget ? 'font-semibold text-rose-600' : 'text-slate-500'}>
              {formatCurrency(cost.grandTotal)} of {formatCurrency(project.budget)}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full rounded-full transition-all ${overBudget ? 'bg-rose-500' : 'bg-teal-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {overBudget && (
            <p className="mt-2 text-xs text-rose-600">
              Over budget by {formatCurrency(cost.grandTotal - project.budget)}. Trim rooms,
              features, or finish levels — or raise your budget.
            </p>
          )}
        </div>
      </Card>

      <Card className="p-6">
        <SectionTitle title="The basics" subtitle="Set the foundation for your plan and estimate." />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location" hint="City & state — used for context, not pricing.">
            <TextInput
              value={project.location}
              onChange={(e) => update({ location: e.target.value })}
              placeholder="e.g. Austin, TX"
            />
          </Field>
          <Field label="Target budget">
            <NumberInput
              value={project.budget}
              onChange={(budget) => update({ budget })}
              min={0}
              step={10000}
              suffix="$"
            />
          </Field>
          <Field label="Lot width" hint="Sets the size of your floor-plan canvas.">
            <NumberInput
              value={project.lotWidth}
              onChange={(lotWidth) => update({ lotWidth: Math.max(20, lotWidth) })}
              min={20}
              suffix="ft"
            />
          </Field>
          <Field label="Lot depth">
            <NumberInput
              value={project.lotDepth}
              onChange={(lotDepth) => update({ lotDepth: Math.max(20, lotDepth) })}
              min={20}
              suffix="ft"
            />
          </Field>
          <Field label="Stories" hint={isPro ? undefined : 'Multi-story is a Pro feature.'}>
            <Select
              value={String(project.stories)}
              onChange={(v) => {
                const n = parseInt(v, 10);
                if (n > 1 && !isPro) {
                  requirePro('Multi-story homes are part of DreamHaus Pro.');
                  return;
                }
                update({ stories: n });
              }}
            >
              <option value="1">Single story</option>
              <option value="2">Two stories</option>
              <option value="3">Three stories</option>
            </Select>
          </Field>
          <Field label="Build quality" hint={QUALITY_TIERS.find((q) => q.id === project.qualityTier)?.blurb}>
            <Select
              value={project.qualityTier}
              onChange={(v) => {
                if (v === 'luxury' && !isPro) {
                  requirePro('The Luxury Custom tier is unlocked with DreamHaus Pro.');
                  return;
                }
                update({ qualityTier: v as Project['qualityTier'] });
              }}
            >
              {QUALITY_TIERS.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.label} (≈ ${q.basePerSqFt}/sf){q.id === 'luxury' && !isPro ? ' 🔒' : ''}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <button
          onClick={goToPlan}
          className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          Start drawing your floor plan →
        </button>
      </Card>
    </div>
  );
}
