'use client';

import React from 'react';
import type { CostBreakdown, CostLineItem, Project } from '../types';
import { Card, Field, NumberInput, SectionTitle, Stat } from '../ui';
import { formatCurrency } from '../costing';

const GROUP_LABELS: Record<CostLineItem['group'], string> = {
  structure: 'Structure & shell',
  finishes: 'Interior finishes',
  amenities: 'Amenities',
  soft: 'Soft costs',
};

const GROUP_ORDER: CostLineItem['group'][] = ['structure', 'finishes', 'amenities', 'soft'];

const GROUP_COLORS: Record<CostLineItem['group'], string> = {
  structure: 'bg-teal-500',
  finishes: 'bg-sky-500',
  amenities: 'bg-amber-500',
  soft: 'bg-violet-500',
};

export function BudgetPanel({
  project,
  cost,
  update,
}: {
  project: Project;
  cost: CostBreakdown;
  update: (patch: Partial<Project>) => void;
}) {
  const overBudget = cost.grandTotal > project.budget && project.budget > 0;

  const groupTotals = GROUP_ORDER.map((g) => ({
    group: g,
    total: cost.lineItems.filter((li) => li.group === g).reduce((s, li) => s + li.amount, 0),
  })).filter((g) => g.total > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Card className="p-6">
        <SectionTitle title="Itemized estimate" subtitle="Every cost driver in your plan, line by line." />
        {cost.lineItems.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">
            Add rooms to your floor plan to generate an estimate.
          </p>
        ) : (
          <div className="space-y-5">
            {GROUP_ORDER.map((group) => {
              const items = cost.lineItems.filter((li) => li.group === group);
              if (items.length === 0) return null;
              const subtotal = items.reduce((s, li) => s + li.amount, 0);
              return (
                <div key={group}>
                  <div className="mb-1.5 flex items-center justify-between border-b border-slate-100 pb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {GROUP_LABELS[group]}
                    </span>
                    <span className="text-xs font-semibold text-slate-500">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                  <ul className="divide-y divide-slate-50">
                    {items.map((li, i) => (
                      <li key={i} className="flex items-start justify-between gap-4 py-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700">{li.label}</div>
                          {li.detail && <div className="text-xs text-slate-400">{li.detail}</div>}
                        </div>
                        <div className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-700">
                          {formatCurrency(li.amount)}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}

            <div className="rounded-xl bg-slate-50 p-4">
              <Row label="Hard + soft costs" value={formatCurrency(cost.hardCosts + cost.softCosts)} />
              <Row
                label={`Contingency (${project.contingencyPct}%)`}
                value={formatCurrency(cost.contingency)}
              />
              <div className="my-2 border-t border-slate-200" />
              <div className="flex items-center justify-between">
                <span className="text-base font-bold text-slate-900">Total estimate</span>
                <span className="text-xl font-bold text-teal-700">
                  {formatCurrency(cost.grandTotal)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>

      <div className="space-y-6">
        <Card className="p-6">
          <SectionTitle title="Summary" />
          <div className="grid grid-cols-2 gap-5">
            <Stat label="Living area" value={`${cost.totalSqFt.toLocaleString()} sf`} />
            <Stat
              label="Cost / sqft"
              value={cost.totalSqFt ? formatCurrency(cost.costPerSqFt) : '—'}
            />
            <Stat label="Budget" value={formatCurrency(project.budget)} />
            <Stat
              label={overBudget ? 'Over by' : 'Remaining'}
              value={formatCurrency(Math.abs(project.budget - cost.grandTotal))}
              accent={overBudget ? 'text-rose-600' : 'text-emerald-600'}
            />
          </div>

          {groupTotals.length > 0 && (
            <div className="mt-5">
              <div className="flex h-3 w-full overflow-hidden rounded-full">
                {groupTotals.map((g) => (
                  <div
                    key={g.group}
                    className={GROUP_COLORS[g.group]}
                    style={{ width: `${(g.total / cost.grandTotal) * 100}%` }}
                    title={`${GROUP_LABELS[g.group]}: ${formatCurrency(g.total)}`}
                  />
                ))}
              </div>
              <div className="mt-2 space-y-1">
                {groupTotals.map((g) => (
                  <div key={g.group} className="flex items-center gap-2 text-xs text-slate-500">
                    <span className={`h-2.5 w-2.5 rounded-full ${GROUP_COLORS[g.group]}`} />
                    <span className="flex-1">{GROUP_LABELS[g.group]}</span>
                    <span className="tabular-nums">
                      {Math.round((g.total / cost.grandTotal) * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card className="p-6">
          <SectionTitle title="Adjust" />
          <Field
            label="Target budget"
            hint="Where you'd like to land. The bar on the overview tracks against this."
          >
            <NumberInput
              value={project.budget}
              onChange={(budget) => update({ budget })}
              min={0}
              step={10000}
              suffix="$"
            />
          </Field>
          <div className="mt-4">
            <Field
              label={`Contingency — ${project.contingencyPct}%`}
              hint="A buffer for the unexpected. 10–15% is typical for new construction."
            >
              <input
                type="range"
                min={0}
                max={25}
                step={1}
                value={project.contingencyPct}
                onChange={(e) => update({ contingencyPct: parseInt(e.target.value, 10) })}
                className="w-full accent-teal-600"
              />
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium tabular-nums text-slate-700">{value}</span>
    </div>
  );
}
