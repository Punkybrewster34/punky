'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { Project, Room } from './types';
import { ROOM_TYPE_MAP } from './catalog';
import { roomArea } from './costing';

interface DragState {
  mode: 'move' | 'resize';
  id: string;
  startX: number;
  startY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
}

export function FloorPlanEditor({
  project,
  floor,
  selectedId,
  onSelect,
  onUpdateRoom,
}: {
  project: Project;
  floor: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdateRoom: (id: string, patch: Partial<Room>) => void;
}) {
  const [scale, setScale] = useState(9); // pixels per foot
  const [snap, setSnap] = useState(true);
  const dragRef = useRef<DragState | null>(null);
  const [, force] = useState(0);

  const margin = 24;
  const lotW = project.lotWidth;
  const lotH = project.lotDepth;
  const svgW = lotW * scale + margin * 2;
  const svgH = lotH * scale + margin * 2;

  const rooms = project.rooms.filter((r) => r.floor === floor);

  const snapVal = (v: number) => (snap ? Math.round(v) : Math.round(v * 2) / 2);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = dragRef.current;
      if (!d) return;
      const dxFt = (e.clientX - d.startX) / scale;
      const dyFt = (e.clientY - d.startY) / scale;
      const room = project.rooms.find((r) => r.id === d.id);
      if (!room) return;
      const type = ROOM_TYPE_MAP[room.type];

      if (d.mode === 'move') {
        let nx = snapVal(d.origX + dxFt);
        let ny = snapVal(d.origY + dyFt);
        nx = Math.max(0, Math.min(nx, lotW - room.w));
        ny = Math.max(0, Math.min(ny, lotH - room.h));
        onUpdateRoom(d.id, { x: nx, y: ny });
      } else {
        const minW = type?.minW ?? 4;
        const minH = type?.minH ?? 4;
        let nw = snapVal(d.origW + dxFt);
        let nh = snapVal(d.origH + dyFt);
        nw = Math.max(minW, Math.min(nw, lotW - room.x));
        nh = Math.max(minH, Math.min(nh, lotH - room.y));
        onUpdateRoom(d.id, { w: nw, h: nh });
      }
    }
    function onUp() {
      dragRef.current = null;
      force((n) => n + 1);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [project.rooms, scale, snap, lotW, lotH, onUpdateRoom]);

  function startMove(e: React.PointerEvent, room: Room) {
    e.stopPropagation();
    onSelect(room.id);
    dragRef.current = {
      mode: 'move',
      id: room.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: room.x,
      origY: room.y,
      origW: room.w,
      origH: room.h,
    };
    force((n) => n + 1);
  }

  function startResize(e: React.PointerEvent, room: Room) {
    e.stopPropagation();
    onSelect(room.id);
    dragRef.current = {
      mode: 'resize',
      id: room.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: room.x,
      origY: room.y,
      origW: room.w,
      origH: room.h,
    };
    force((n) => n + 1);
  }

  // Grid lines every 5 feet.
  const gridLines: React.ReactNode[] = [];
  for (let x = 0; x <= lotW; x += 5) {
    gridLines.push(
      <line
        key={`vx${x}`}
        x1={margin + x * scale}
        y1={margin}
        x2={margin + x * scale}
        y2={margin + lotH * scale}
        stroke={x % 10 === 0 ? '#e2e8f0' : '#f1f5f9'}
        strokeWidth={1}
      />,
    );
  }
  for (let y = 0; y <= lotH; y += 5) {
    gridLines.push(
      <line
        key={`hy${y}`}
        x1={margin}
        y1={margin + y * scale}
        x2={margin + lotW * scale}
        y2={margin + y * scale}
        stroke={y % 10 === 0 ? '#e2e8f0' : '#f1f5f9'}
        strokeWidth={1}
      />,
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2 text-slate-500">
          <span>Lot: {lotW}′ × {lotH}′</span>
          <span className="text-slate-300">·</span>
          <span>{rooms.length} rooms on this floor</span>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={snap}
              onChange={(e) => setSnap(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-400"
            />
            Snap to grid
          </label>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setScale((s) => Math.max(5, s - 1))}
              className="h-7 w-7 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
              aria-label="Zoom out"
            >
              −
            </button>
            <button
              onClick={() => setScale((s) => Math.min(20, s + 1))}
              className="h-7 w-7 rounded border border-slate-300 text-slate-600 hover:bg-slate-50"
              aria-label="Zoom in"
            >
              +
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-slate-200 bg-slate-50">
        <svg
          width={svgW}
          height={svgH}
          onPointerDown={() => onSelect(null)}
          className="touch-none select-none"
          style={{ minWidth: '100%' }}
        >
          {/* lot boundary */}
          <rect
            x={margin}
            y={margin}
            width={lotW * scale}
            height={lotH * scale}
            fill="white"
            stroke="#cbd5e1"
            strokeWidth={2}
            strokeDasharray="6 4"
          />
          {gridLines}

          {rooms.map((room) => {
            const type = ROOM_TYPE_MAP[room.type];
            const px = margin + room.x * scale;
            const py = margin + room.y * scale;
            const pw = room.w * scale;
            const ph = room.h * scale;
            const selected = room.id === selectedId;
            const area = roomArea(room.w, room.h);
            const showLabel = pw > 50 && ph > 34;
            return (
              <g key={room.id}>
                <rect
                  x={px}
                  y={py}
                  width={pw}
                  height={ph}
                  rx={3}
                  fill={type?.color ?? '#e2e8f0'}
                  fillOpacity={0.85}
                  stroke={selected ? '#0d9488' : '#475569'}
                  strokeWidth={selected ? 2.5 : 1}
                  onPointerDown={(e) => startMove(e, room)}
                  style={{ cursor: 'move' }}
                />
                {showLabel && (
                  <text
                    x={px + pw / 2}
                    y={py + ph / 2 - 4}
                    textAnchor="middle"
                    className="pointer-events-none"
                    fontSize={Math.min(13, Math.max(9, scale * 1.1))}
                    fontWeight={600}
                    fill="#1e293b"
                  >
                    {type?.icon} {room.name}
                  </text>
                )}
                {showLabel && (
                  <text
                    x={px + pw / 2}
                    y={py + ph / 2 + 12}
                    textAnchor="middle"
                    className="pointer-events-none"
                    fontSize={10}
                    fill="#475569"
                  >
                    {room.w}′ × {room.h}′ · {area} sf
                  </text>
                )}
                {/* resize handle */}
                <rect
                  x={px + pw - 9}
                  y={py + ph - 9}
                  width={12}
                  height={12}
                  rx={2}
                  fill={selected ? '#0d9488' : '#64748b'}
                  stroke="white"
                  strokeWidth={1.5}
                  onPointerDown={(e) => startResize(e, room)}
                  style={{ cursor: 'nwse-resize' }}
                />
              </g>
            );
          })}
        </svg>
      </div>
      <p className="mt-2 text-xs text-slate-400">
        Drag a room to move it · drag the corner handle to resize · tap to select. Each grid square
        is 5 feet.
      </p>
    </div>
  );
}
