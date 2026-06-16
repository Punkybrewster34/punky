'use client';

import React, { useMemo, useState } from 'react';
import { useAppState, createProject } from './storage';
import { computeCost, formatCurrency } from './costing';
import { FREE_LIMITS } from './catalog';
import { ProBadge, Button } from './ui';
import { UpgradeModal } from './UpgradeModal';
import { OverviewPanel } from './panels/OverviewPanel';
import { FloorPlanPanel } from './panels/FloorPlanPanel';
import { StylePanel } from './panels/StylePanel';
import { FeaturesPanel } from './panels/FeaturesPanel';
import { BudgetPanel } from './panels/BudgetPanel';
import { SummaryPanel } from './panels/SummaryPanel';

type TabId = 'overview' | 'plan' | 'style' | 'features' | 'budget' | 'summary';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'overview', label: 'Overview', icon: '🏠' },
  { id: 'plan', label: 'Floor Plan', icon: '📐' },
  { id: 'style', label: 'Style & Finishes', icon: '🎨' },
  { id: 'features', label: 'Amenities', icon: '✨' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'summary', label: 'Summary', icon: '📋' },
];

export function DreamHouseApp() {
  const { state, setState, hydrated, activeProject, updateProject } = useAppState();
  const [tab, setTab] = useState<TabId>('overview');
  const [upgrade, setUpgrade] = useState<{ open: boolean; reason?: string }>({ open: false });

  const cost = useMemo(
    () => (activeProject ? computeCost(activeProject) : null),
    [activeProject],
  );

  function requirePro(reason: string) {
    setUpgrade({ open: true, reason });
  }

  function activatePro() {
    setState((s) => ({ ...s, isPro: true }));
    setUpgrade({ open: false });
  }

  function newProject() {
    if (!state.isPro && state.projects.length >= FREE_LIMITS.maxProjects) {
      requirePro('Saving multiple projects is a Pro feature — keep every idea side by side.');
      return;
    }
    const p = createProject(`Project ${state.projects.length + 1}`);
    setState((s) => ({ ...s, projects: [...s.projects, p], activeProjectId: p.id }));
    setTab('overview');
  }

  function switchProject(id: string) {
    setState((s) => ({ ...s, activeProjectId: id }));
  }

  function deleteProject(id: string) {
    setState((s) => {
      const remaining = s.projects.filter((p) => p.id !== id);
      const fallback = remaining[0] ?? createProject();
      const projects = remaining.length ? remaining : [fallback];
      return {
        ...s,
        projects,
        activeProjectId: projects[0].id,
      };
    });
  }

  function handleExport() {
    if (!state.isPro) {
      requirePro('Exporting a PDF spec sheet is part of DreamHaus Pro.');
      return;
    }
    window.print();
  }

  if (!hydrated || !activeProject || !cost) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Loading your workspace…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-lg">
              🏡
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-base font-bold text-slate-900">
                DreamHaus {state.isPro && <ProBadge />}
              </div>
              <div className="-mt-0.5 text-[11px] text-slate-400">Design & budget your dream home</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={activeProject.id}
              onChange={(e) => switchProject(e.target.value)}
              className="max-w-[160px] rounded-lg border border-slate-300 px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              {state.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Button variant="secondary" onClick={newProject} className="px-3">
              + New
            </Button>
            {state.projects.length > 1 && (
              <Button
                variant="ghost"
                onClick={() => deleteProject(activeProject.id)}
                className="px-2 text-slate-400 hover:text-rose-600"
                title="Delete this project"
              >
                🗑
              </Button>
            )}
            {!state.isPro && (
              <Button
                onClick={() => requirePro('Unlock everything DreamHaus can do.')}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
              >
                ★ Go Pro
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-auto max-w-7xl overflow-x-auto px-4">
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                  tab === t.id
                    ? 'border-teal-600 text-teal-700'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Live total strip */}
      <div className="border-b border-slate-200 bg-white print:hidden">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2 text-sm">
          <span className="text-slate-500">
            Living area <span className="font-semibold text-slate-800">{cost.totalSqFt.toLocaleString()} sf</span>
          </span>
          <span className="text-slate-500">
            Rooms <span className="font-semibold text-slate-800">{activeProject.rooms.length}</span>
          </span>
          <span className="text-slate-500">
            Est. total{' '}
            <span
              className={`font-semibold ${
                cost.grandTotal > activeProject.budget && activeProject.budget > 0
                  ? 'text-rose-600'
                  : 'text-teal-700'
              }`}
            >
              {formatCurrency(cost.grandTotal)}
            </span>
          </span>
          <span className="text-slate-500">
            Budget <span className="font-semibold text-slate-800">{formatCurrency(activeProject.budget)}</span>
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'overview' && (
          <OverviewPanel
            project={activeProject}
            cost={cost}
            isPro={state.isPro}
            update={updateProject}
            requirePro={requirePro}
            goToPlan={() => setTab('plan')}
          />
        )}
        {tab === 'plan' && (
          <FloorPlanPanel
            project={activeProject}
            isPro={state.isPro}
            update={updateProject}
            requirePro={requirePro}
          />
        )}
        {tab === 'style' && <StylePanel project={activeProject} update={updateProject} />}
        {tab === 'features' && <FeaturesPanel project={activeProject} update={updateProject} />}
        {tab === 'budget' && (
          <BudgetPanel project={activeProject} cost={cost} update={updateProject} />
        )}
        {tab === 'summary' && (
          <SummaryPanel
            project={activeProject}
            cost={cost}
            isPro={state.isPro}
            update={updateProject}
            onExport={handleExport}
          />
        )}
      </main>

      <UpgradeModal
        open={upgrade.open}
        reason={upgrade.reason}
        onClose={() => setUpgrade({ open: false })}
        onUpgrade={activatePro}
      />
    </div>
  );
}
