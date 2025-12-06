import { useState, useMemo } from 'react';

interface ChatDatePickerProps {
  selectedDate?: string; // YYYY-MM-DD format
  onSelect: (date: string) => void;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  // Days when clinic is closed (0 = Sunday, 6 = Saturday)
  closedDays?: number[];
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function ChatDatePicker({
  selectedDate,
  onSelect,
  minDate = new Date(),
  maxDate,
  disabled,
  closedDays = [0, 6], // Closed on weekends by default
}: ChatDatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const date = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1);
  });

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month and how many days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: Array<{ date: Date; isCurrentMonth: boolean; isDisabled: boolean }> = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startDayOfWeek; i++) {
      const date = new Date(year, month, -startDayOfWeek + i + 1);
      days.push({ date, isCurrentMonth: false, isDisabled: true });
    }

    // Add days of current month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const isPast = date < today;
      const isBeforeMin = minDate && date < minDate;
      const isAfterMax = maxDate && date > maxDate;
      const isClosed = closedDays.includes(date.getDay());

      days.push({
        date,
        isCurrentMonth: true,
        isDisabled: isPast || isBeforeMin || isAfterMax || isClosed,
      });
    }

    return days;
  }, [currentMonth, today, minDate, maxDate, closedDays]);

  const goToPrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Quick select options
  const quickOptions = useMemo(() => {
    const options: Array<{ label: string; date: Date }> = [];
    let nextAvailable = new Date(today);

    // Find next 3 available dates
    for (let i = 0; i < 14 && options.length < 3; i++) {
      const candidate = addDays(today, i);
      if (!closedDays.includes(candidate.getDay())) {
        if (i === 0) {
          options.push({ label: 'Today', date: candidate });
        } else if (i === 1) {
          options.push({ label: 'Tomorrow', date: candidate });
        } else {
          options.push({
            label: candidate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
            date: candidate,
          });
        }
      }
    }

    return options;
  }, [today, closedDays]);

  const isPrevDisabled = currentMonth <= new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="mt-3 bg-white rounded-lg border border-gray-200 p-3">
      {/* Quick select buttons */}
      <div className="flex gap-2 mb-3">
        {quickOptions.map((option, index) => {
          const dateStr = formatDate(option.date);
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={index}
              onClick={() => onSelect(dateStr)}
              disabled={disabled}
              className={`flex-1 py-1.5 px-2 text-xs rounded-md transition-all ${
                isSelected
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={goToPrevMonth}
          disabled={isPrevDisabled || disabled}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-medium text-gray-900">
          {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          onClick={goToNextMonth}
          disabled={disabled}
          className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Next month"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-xs font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.map((day, index) => {
          const dateStr = formatDate(day.date);
          const isSelected = dateStr === selectedDate;
          const isToday = formatDate(day.date) === formatDate(today);

          if (!day.isCurrentMonth) {
            return <div key={index} className="aspect-square" />;
          }

          return (
            <button
              key={index}
              onClick={() => !day.isDisabled && onSelect(dateStr)}
              disabled={disabled || day.isDisabled}
              className={`aspect-square flex items-center justify-center text-xs rounded transition-all ${
                isSelected
                  ? 'bg-primary-600 text-white font-medium'
                  : isToday
                    ? 'border border-primary-500 text-primary-700'
                    : day.isDisabled
                      ? 'text-gray-300 cursor-not-allowed'
                      : 'text-gray-700 hover:bg-primary-50'
              }`}
            >
              {day.date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
