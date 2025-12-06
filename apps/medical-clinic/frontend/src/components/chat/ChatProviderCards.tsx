interface Provider {
  id: string;
  name: string;
  displayName?: string;
  specialty: string;
  team?: string;
  acceptsNewPatients?: boolean;
  bio?: string;
}

interface ChatProviderCardsProps {
  providers: Provider[];
  selectedId?: string;
  onSelect: (provider: Provider) => void;
  disabled?: boolean;
}

export function ChatProviderCards({ providers, selectedId, onSelect, disabled }: ChatProviderCardsProps) {
  return (
    <div className="mt-2 space-y-1.5">
      {providers.map((provider) => {
        const isSelected = provider.id === selectedId;
        const firstName = provider.name.replace('Dr. ', '').split(' ')[0];

        return (
          <button
            key={provider.id}
            onClick={() => onSelect(provider)}
            disabled={disabled}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-left ${
              isSelected
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-200 bg-white hover:border-primary-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {/* Compact info */}
            <div className="flex-1 min-w-0">
              <span className="text-sm font-medium text-gray-900">
                Dr. {firstName}
              </span>
              {provider.team && (
                <span className="text-xs text-gray-400 ml-2">
                  Team {provider.team}
                </span>
              )}
            </div>

            {/* Status indicator */}
            {provider.acceptsNewPatients !== false ? (
              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" title="Accepting patients" />
            ) : (
              <div className="w-2 h-2 bg-gray-300 rounded-full flex-shrink-0" title="Not accepting" />
            )}
          </button>
        );
      })}
    </div>
  );
}
