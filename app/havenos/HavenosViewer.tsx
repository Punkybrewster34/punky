'use client';

import { useState } from 'react';

const LABELS: Record<string, string> = {
  monday: 'Monday',
  scorecard: 'Scorecard',
  prospects: 'Prospects',
  compliance: 'Standards',
};

export default function HavenosViewer({
  names,
  generatedAt,
}: {
  names: string[];
  generatedAt: string;
}) {
  const ordered = ['monday', 'scorecard', 'prospects', 'compliance'].filter((n) =>
    names.includes(n),
  );
  const [active, setActive] = useState(ordered[0] ?? names[0]);

  return (
    <main className="min-h-screen flex flex-col" style={{ background: '#f6f8fc' }}>
      <nav
        className="flex items-center gap-1 px-3 py-2 overflow-x-auto"
        style={{ background: '#12307d' }}
      >
        <span
          className="text-white font-bold tracking-[0.2em] mr-3 text-sm shrink-0"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          HAVEN<span style={{ color: '#ffc42c' }}> OS</span>
        </span>
        {ordered.map((n) => (
          <button
            key={n}
            onClick={() => setActive(n)}
            className="px-3 py-1.5 rounded-full text-sm font-semibold shrink-0"
            style={
              active === n
                ? { background: '#ffc42c', color: '#12307d' }
                : { background: 'transparent', color: '#7eb9ff' }
            }
          >
            {LABELS[n] ?? n}
          </button>
        ))}
        <span className="ml-auto text-xs shrink-0" style={{ color: '#7eb9ff' }}>
          data: {generatedAt}
        </span>
      </nav>
      <iframe
        key={active}
        src={`/api/havenos/view?d=${active}`}
        title={`HavenOS ${active}`}
        className="flex-1 w-full border-0"
      />
    </main>
  );
}
