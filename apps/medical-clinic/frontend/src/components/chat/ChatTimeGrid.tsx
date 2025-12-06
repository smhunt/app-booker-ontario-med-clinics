interface TimeSlot {
  time: string;
  available: boolean;
}

interface ChatTimeGridProps {
  slots: TimeSlot[];
  selectedTime?: string;
  onSelect: (time: string) => void;
  disabled?: boolean;
}

function formatTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

function groupByPeriod(slots: TimeSlot[]): { morning: TimeSlot[]; afternoon: TimeSlot[] } {
  const morning: TimeSlot[] = [];
  const afternoon: TimeSlot[] = [];

  slots.forEach(slot => {
    const hour = parseInt(slot.time.split(':')[0], 10);
    if (hour < 12) {
      morning.push(slot);
    } else {
      afternoon.push(slot);
    }
  });

  return { morning, afternoon };
}

function TimeSlotGrid({
  slots,
  selectedTime,
  onSelect,
  disabled
}: {
  slots: TimeSlot[];
  selectedTime?: string;
  onSelect: (time: string) => void;
  disabled?: boolean;
}) {
  if (slots.length === 0) return null;

  return (
    <div className="grid grid-cols-4 gap-1.5">
      {slots.map((slot) => {
        const isSelected = slot.time === selectedTime;
        const isAvailable = slot.available;

        return (
          <button
            key={slot.time}
            onClick={() => isAvailable && onSelect(slot.time)}
            disabled={disabled || !isAvailable}
            className={`py-1.5 px-1 text-xs rounded transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 ${
              isSelected
                ? 'bg-primary-600 text-white font-medium'
                : isAvailable
                  ? 'bg-white border border-gray-200 text-gray-700 hover:border-primary-300 hover:bg-primary-50'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {formatTime(slot.time)}
          </button>
        );
      })}
    </div>
  );
}

export function ChatTimeGrid({ slots, selectedTime, onSelect, disabled }: ChatTimeGridProps) {
  const { morning, afternoon } = groupByPeriod(slots);
  const hasSlots = morning.length > 0 || afternoon.length > 0;

  if (!hasSlots) {
    return (
      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-sm text-yellow-800">No available time slots for this date.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-3">
      {morning.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Morning</p>
          <TimeSlotGrid
            slots={morning}
            selectedTime={selectedTime}
            onSelect={onSelect}
            disabled={disabled}
          />
        </div>
      )}

      {afternoon.length > 0 && (
        <div>
          <p className="text-xs font-medium text-gray-500 mb-1.5">Afternoon</p>
          <TimeSlotGrid
            slots={afternoon}
            selectedTime={selectedTime}
            onSelect={onSelect}
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
}
