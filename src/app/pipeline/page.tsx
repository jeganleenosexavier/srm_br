'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useDroppable } from '@dnd-kit/core';
import FilterBar, { type Filters } from '@/components/shared/FilterBar';
import PersonCard from '@/components/shared/PersonCard';
import ConfirmModal from '@/components/shared/ConfirmModal';
import { STAGES, STAGE_LABELS } from '@/lib/constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Person {
  id: string;
  name: string;
  email: string;
  type: string;
  region: string;
  stage: string;
  riskLevel: string;
  mentor?: { id: string; name: string } | null;
}

interface FunnelData {
  stageCounts: { stage: string; label: string; count: number }[];
  totalEntered: number;
  fteHired: number;
  conversionRate: number;
  byRegion: { region: string; total: number; hired: number; conversionRate: number }[];
}

export default function PipelineKanbanPage() {
  const [grouped, setGrouped] = useState<Record<string, Person[]>>({});
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [filters, setFilters] = useState<Filters>({ region: '', type: '', stage: '', risk: '' });
  const [role, setRole] = useState('viewer');
  const [activePerson, setActivePerson] = useState<Person | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{ personId: string; newStage: string; personName: string } | null>(null);
  const [showFunnel, setShowFunnel] = useState(true);
  const router = useRouter();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams();
    if (filters.region) params.set('region', filters.region);
    if (filters.type) params.set('type', filters.type);

    const [pipelineRes, funnelRes] = await Promise.all([
      fetch(`/api/pipeline?${params}`),
      fetch(`/api/pipeline/funnel?${params.get('region') ? `region=${params.get('region')}` : ''}`),
    ]);

    if (pipelineRes.ok) setGrouped(await pipelineRes.json());
    if (funnelRes.ok) setFunnel(await funnelRes.json());
  }, [filters]);

  useEffect(() => {
    fetchData();
    fetch('/api/auth/me').then(r => r.json()).then(d => setRole(d.user?.role || 'viewer'));
  }, [fetchData]);

  const handleDragStart = (event: DragStartEvent) => {
    const person = Object.values(grouped).flat().find(p => p.id === event.active.id);
    setActivePerson(person || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActivePerson(null);
    const { active, over } = event;
    if (!over) return;

    const personId = active.id as string;
    const newStage = over.id as string;

    const person = Object.values(grouped).flat().find(p => p.id === personId);
    if (!person || person.stage === newStage) return;

    const requiresConfirm = ['fte_offer', 'fte_hired', 'exit'].includes(newStage);
    if (requiresConfirm) {
      setPendingTransition({ personId, newStage, personName: person.name });
      return;
    }

    await doTransition(personId, newStage);
  };

  const doTransition = async (personId: string, newStage: string) => {
    await fetch('/api/pipeline/transition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ personId, newStage }),
    });
    fetchData();
  };

  const isReadOnly = role === 'viewer';

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-gray-800">Pipeline</h2>
          <button
            onClick={() => router.push('/pipeline/table')}
            className="text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2.5 py-1 rounded-lg"
          >
            Table View
          </button>
        </div>
        <button
          onClick={() => setShowFunnel(!showFunnel)}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          {showFunnel ? 'Hide' : 'Show'} Funnel
        </button>
      </div>

      <div className="mb-4">
        <FilterBar filters={filters} onChange={setFilters} showStage={false} showRisk={false} />
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto pb-4" style={{ minHeight: 400 }}>
          {STAGES.map((stage) => (
            <StageColumn
              key={stage}
              stage={stage}
              people={grouped[stage] || []}
              onCardClick={(id) => router.push(`/people/${id}`)}
              isReadOnly={isReadOnly}
            />
          ))}
        </div>

        <DragOverlay>
          {activePerson && <PersonCard person={activePerson} isDragging />}
        </DragOverlay>
      </DndContext>

      {pendingTransition && (
        <ConfirmModal
          title={`Move to ${STAGE_LABELS[pendingTransition.newStage]}`}
          message={`Are you sure you want to move ${pendingTransition.personName} to "${STAGE_LABELS[pendingTransition.newStage]}"?`}
          confirmLabel="Move"
          onConfirm={() => {
            doTransition(pendingTransition.personId, pendingTransition.newStage);
            setPendingTransition(null);
          }}
          onCancel={() => setPendingTransition(null)}
        />
      )}

      {showFunnel && funnel && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Conversion Funnel</h3>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span>Total: <strong className="text-gray-800">{funnel.totalEntered}</strong></span>
              <span>FTE Hired: <strong className="text-gray-800">{funnel.fteHired}</strong></span>
              <span>Conversion: <strong className="text-[#1e3a5f]">{funnel.conversionRate}%</strong></span>
            </div>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel.stageCounts} layout="horizontal">
                <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={50} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [String(value), 'People']} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {funnel.stageCounts.map((entry, idx) => (
                    <Cell key={idx} fill={idx < 6 ? '#1e3a5f' : idx === 6 ? '#c9a84c' : '#94a3b8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {funnel.byRegion.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-600 mb-2">By Region</p>
              <div className="flex gap-4 flex-wrap">
                {funnel.byRegion.map((r) => (
                  <div key={r.region} className="text-xs text-gray-600">
                    <span className="font-medium">{r.region}</span>: {r.hired}/{r.total} ({r.conversionRate}%)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StageColumn({ stage, people, onCardClick, isReadOnly }: {
  stage: string;
  people: Person[];
  onCardClick: (id: string) => void;
  isReadOnly: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, disabled: isReadOnly });

  return (
    <div
      ref={setNodeRef}
      className={`flex-shrink-0 w-52 rounded-xl border transition-colors ${
        isOver ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="px-3 py-2.5 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-700">{STAGE_LABELS[stage]}</span>
          <span className="text-[10px] bg-gray-200 text-gray-600 rounded-full px-1.5 py-0.5 font-medium">{people.length}</span>
        </div>
      </div>
      <div className="p-2 space-y-2 min-h-[100px]">
        {people.map((person) => (
          <DraggableCard key={person.id} person={person} onClick={() => onCardClick(person.id)} disabled={isReadOnly} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ person, onClick, disabled }: { person: Person; onClick: () => void; disabled: boolean }) {
  const { useDraggable } = require('@dnd-kit/core');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: person.id,
    disabled,
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} style={{ opacity: isDragging ? 0.4 : 1 }}>
      <PersonCard person={person} onClick={onClick} />
    </div>
  );
}
