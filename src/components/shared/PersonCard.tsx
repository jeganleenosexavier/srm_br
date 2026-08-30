'use client';

import StatusBadge from './StatusBadge';
import { COUNTRIES } from '@/lib/constants';

interface PersonCardProps {
  person: {
    id: string;
    name: string;
    region: string;
    type: string;
    riskLevel: string;
    mentor?: { name: string } | null;
  };
  onClick?: () => void;
  isDragging?: boolean;
}

export default function PersonCard({ person, onClick, isDragging }: PersonCardProps) {
  const country = COUNTRIES.find((c) => c.code === person.region);

  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-lg border border-gray-200 p-3 cursor-pointer hover:shadow-md transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-[#1e3a5f]/30 opacity-90' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-1.5">
        <span className="text-sm font-medium text-gray-800 leading-tight">{person.name}</span>
        <span className="text-base ml-1 flex-shrink-0">{country?.flag}</span>
      </div>
      <div className="flex items-center gap-1.5 flex-wrap">
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
          person.type === 'intern'
            ? 'bg-blue-50 text-blue-700'
            : 'bg-purple-50 text-purple-700'
        }`}>
          {person.type === 'fte' ? 'FTE' : 'Intern'}
        </span>
        <StatusBadge level={person.riskLevel as 'green' | 'amber' | 'red'} />
      </div>
      {person.mentor && (
        <div className="mt-1.5 text-[10px] text-gray-400 truncate">
          Mentor: {person.mentor.name}
        </div>
      )}
    </div>
  );
}
