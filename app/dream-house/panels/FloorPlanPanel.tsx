'use client';

import React, { useMemo, useState } from 'react';
import type { Project, Room } from '../types';
import { FREE_LIMITS, ROOM_TYPES, ROOM_TYPE_MAP, type RoomType } from '../catalog';
import { roomArea } from '../costing';
import { FloorPlanEditor } from '../FloorPlanEditor';
import { Button, Card, Field, NumberInput, SectionTitle, Select, TextInput } from '../ui';
import { uid } from '../storage';

const CATEGORY_LABELS: Record<RoomType['category'], string> = {
  living: 'Living',
  sleep: 'Bedrooms',
  bath: 'Bathrooms',
  work: 'Work',
  utility: 'Utility',
  leisure: 'Leisure',
  outdoor: 'Outdoor',
};

const CATEGORY_ORDER: RoomType['category'][] = [
  'living',
  'sleep',
  'bath',
  'work',
  'leisure',
  'utility',
  'outdoor',
];

export function FloorPlanPanel({
  project,
  isPro,
  update,
  requirePro,
}: {
  project: Project;
  isPro: boolean;
  update: (patch: Partial<Project>) => void;
  requirePro: (reason: string) => void;
}) {
  const [floor, setFloor] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = project.rooms.find((r) => r.id === selectedId) ?? null;

  const grouped = useMemo(() => {
    const map = new Map<RoomType['category'], RoomType[]>();
    for (const t of ROOM_TYPES) {
      if (!map.has(t.category)) map.set(t.category, []);
      map.get(t.category)!.push(t);
    }
    return map;
  }, []);

  function findOpenSpot(w: number, h: number): { x: number; y: number } {
    // Simple sweep: try grid positions and pick the first that doesn't overlap.
    const onFloor = project.rooms.filter((r) => r.floor === floor);
    const overlaps = (x: number, y: number) =>
      onFloor.some(
        (r) => x < r.x + r.w && x + w > r.x && y < r.y + r.h && y + h > r.y,
      );
    for (let y = 0; y + h <= project.lotDepth; y += 2) {
      for (let x = 0; x + w <= project.lotWidth; x += 2) {
        if (!overlaps(x, y)) return { x, y };
      }
    }
    return { x: 0, y: 0 };
  }

  function addRoom(type: RoomType) {
    if (!isPro && project.rooms.length >= FREE_LIMITS.maxRooms) {
      requirePro(
        `The free plan includes up to ${FREE_LIMITS.maxRooms} rooms. Go Pro for unlimited.`,
      );
      return;
    }
    const spot = findOpenSpot(type.defaultW, type.defaultH);
    const count = project.rooms.filter((r) => r.type === type.id).length;
    const newRoom: Room = {
      id: uid(),
      type: type.id,
      name: count > 0 ? `${type.label} ${count + 1}` : type.label,
      floor,
      x: spot.x,
      y: spot.y,
      w: type.defaultW,
      h: type.defaultH,
    };
    update({ rooms: [...project.rooms, newRoom] });
    setSelectedId(newRoom.id);
  }

  function updateRoom(id: string, patch: Partial<Room>) {
    update({ rooms: project.rooms.map((r) => (r.id === id ? { ...r, ...patch } : r)) });
  }

  function deleteRoom(id: string) {
    update({ rooms: project.rooms.filter((r) => r.id !== id) });
    if (selectedId === id) setSelectedId(null);
  }

  function duplicateRoom(room: Room) {
    if (!isPro && project.rooms.length >= FREE_LIMITS.maxRooms) {
      requirePro(`The free plan includes up to ${FREE_LIMITS.maxRooms} rooms.`);
      return;
    }
    const spot = findOpenSpot(room.w, room.h);
    const copy: Room = { ...room, id: uid(), x: spot.x, y: spot.y, name: `${room.name} copy` };
    update({ rooms: [...project.rooms, copy] });
    setSelectedId(copy.id);
  }

  const floorRooms = project.rooms.filter((r) => r.floor === floor);
  const floorSqFt = floorRooms.reduce((s, r) => s + roomArea(r.w, r.h), 0);

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)_280px]">
      {/* Room library */}
      <Card className="p-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-auto">
        <SectionTitle title="Add rooms" subtitle="Click to drop onto the plan." />
        <div className="space-y-4">
          {CATEGORY_ORDER.map((cat) => {
            const items = grouped.get(cat);
            if (!items) return null;
            return (
              <div key={cat}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  {CATEGORY_LABELS[cat]}
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {items.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => addRoom(t)}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1.5 text-left text-xs text-slate-700 transition hover:border-teal-400 hover:bg-teal-50"
                    >
                      <span className="text-sm leading-none">{t.icon}</span>
                      <span className="truncate">{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Canvas */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex gap-1">
            {Array.from({ length: project.stories }).map((_, i) => (
              <button
                key={i}
                onClick={() => setFloor(i)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  floor === i
                    ? 'bg-teal-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {i === 0 ? 'Ground floor' : `Floor ${i + 1}`}
              </button>
            ))}
          </div>
          <div className="text-sm text-slate-500">
            This floor: <span className="font-semibold text-slate-700">{floorSqFt.toLocaleString()} sf</span>
          </div>
        </div>
        <FloorPlanEditor
          project={project}
          floor={floor}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onUpdateRoom={updateRoom}
        />
      </Card>

      {/* Properties */}
      <Card className="p-4 lg:max-h-[calc(100vh-9rem)] lg:overflow-auto">
        {selected ? (
          <div className="space-y-4">
            <SectionTitle
              title="Room details"
              subtitle={`${roomArea(selected.w, selected.h).toLocaleString()} sq ft`}
            />
            <Field label="Name">
              <TextInput
                value={selected.name}
                onChange={(e) => updateRoom(selected.id, { name: e.target.value })}
              />
            </Field>
            <Field label="Type">
              <Select
                value={selected.type}
                onChange={(v) => {
                  const t = ROOM_TYPE_MAP[v];
                  updateRoom(selected.id, { type: v, name: t ? t.label : selected.name });
                }}
              >
                {ROOM_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Width">
                <NumberInput
                  value={selected.w}
                  onChange={(w) => updateRoom(selected.id, { w: Math.max(2, w) })}
                  min={2}
                  suffix="ft"
                />
              </Field>
              <Field label="Depth">
                <NumberInput
                  value={selected.h}
                  onChange={(h) => updateRoom(selected.id, { h: Math.max(2, h) })}
                  min={2}
                  suffix="ft"
                />
              </Field>
            </div>
            {project.stories > 1 && (
              <Field label="Floor">
                <Select
                  value={String(selected.floor)}
                  onChange={(v) => updateRoom(selected.id, { floor: parseInt(v, 10) })}
                >
                  {Array.from({ length: project.stories }).map((_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? 'Ground floor' : `Floor ${i + 1}`}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => duplicateRoom(selected)}>
                Duplicate
              </Button>
              <Button variant="danger" className="flex-1" onClick={() => deleteRoom(selected.id)}>
                Delete
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center py-10 text-center">
            <div className="text-4xl">📐</div>
            <p className="mt-3 text-sm font-medium text-slate-600">No room selected</p>
            <p className="mt-1 text-xs text-slate-400">
              Add a room from the library, then tap it on the plan to edit its name, type, and
              dimensions.
            </p>
            {floorRooms.length > 0 && (
              <div className="mt-5 w-full text-left">
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Rooms on this floor
                </div>
                <ul className="space-y-1">
                  {floorRooms.map((r) => (
                    <li key={r.id}>
                      <button
                        onClick={() => setSelectedId(r.id)}
                        className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                      >
                        <span className="truncate">
                          {ROOM_TYPE_MAP[r.type]?.icon} {r.name}
                        </span>
                        <span className="text-xs text-slate-400">{roomArea(r.w, r.h)} sf</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
