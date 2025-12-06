import { useState } from 'react';

interface AppointmentType {
  id: string;
  name: string;
  duration: number;
  description?: string;
  isCommon?: boolean;
}

interface ChatAppointmentTypesProps {
  types: AppointmentType[];
  selectedId?: string;
  onSelect: (type: AppointmentType) => void;
  disabled?: boolean;
}

export function ChatAppointmentTypes({ types, selectedId, onSelect, disabled }: ChatAppointmentTypesProps) {
  const [showAll, setShowAll] = useState(false);

  // Separate common and other types
  const commonTypes = types.filter(t => t.isCommon !== false);
  const otherTypes = types.filter(t => t.isCommon === false);
  const hasOtherTypes = otherTypes.length > 0;

  const displayTypes = showAll ? types : commonTypes.slice(0, 4);

  return (
    <div className="mt-3 space-y-2">
      {displayTypes.map((type) => {
        const isSelected = type.id === selectedId;

        return (
          <button
            key={type.id}
            onClick={() => onSelect(type)}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1 ${
              isSelected
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-primary-300 hover:bg-gray-50'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isSelected ? 'text-primary-900' : 'text-gray-900'}`}>
                  {type.name}
                </p>
                {type.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">
                    {type.description}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-xs text-gray-500">
                  {type.duration} min
                </span>
                {isSelected && (
                  <svg className="w-4 h-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {/* Show more button */}
      {hasOtherTypes && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="w-full py-2 text-sm text-primary-600 hover:text-primary-700 flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Show {otherTypes.length} more types
        </button>
      )}

      {showAll && hasOtherTypes && (
        <button
          onClick={() => setShowAll(false)}
          className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
          Show less
        </button>
      )}
    </div>
  );
}
