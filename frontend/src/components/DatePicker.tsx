import { useState } from 'react';
import {
  format,
  addDays,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isBefore,
  startOfToday,
  addMonths,
  subMonths,
} from 'date-fns';

interface DatePickerProps {
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  minDaysAhead?: number;
  maxDaysAhead?: number;
}

export function DatePicker({
  selectedDate,
  onSelectDate,
  minDaysAhead = 1,
  maxDaysAhead = 90,
}: DatePickerProps) {
  const today = startOfToday();
  const [currentMonth, setCurrentMonth] = useState(today);

  const minDate = addDays(today, minDaysAhead);
  const maxDate = addDays(today, maxDaysAhead);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Pad to start on Sunday
  const startDayOfWeek = monthStart.getDay();
  const paddingDays = Array.from({ length: startDayOfWeek }, (_, i) =>
    addDays(monthStart, -(startDayOfWeek - i))
  );

  const allDays = [...paddingDays, ...daysInMonth];

  const isDateSelectable = (date: Date) => {
    return !isBefore(date, minDate) && !isBefore(maxDate, date);
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-300 p-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="Previous month"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h3 className="text-lg font-semibold">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-gray-100 rounded"
          aria-label="Next month"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div
            key={day}
            className="text-center text-sm font-medium text-gray-600 py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {allDays.map((day, index) => {
          const dateString = format(day, 'yyyy-MM-dd');
          const isSelected = selectedDate === dateString;
          const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
          const isSelectable = isDateSelectable(day);
          const isToday = isSameDay(day, today);

          return (
            <button
              key={index}
              onClick={() => isSelectable && onSelectDate(dateString)}
              disabled={!isSelectable}
              className={`
                aspect-square p-2 text-sm rounded-lg transition-colors
                ${isSelected ? 'bg-primary-600 text-white font-bold' : ''}
                ${!isSelected && isToday ? 'border-2 border-primary-600' : ''}
                ${
                  !isSelected && !isToday && isSelectable && isCurrentMonth
                    ? 'hover:bg-primary-50 text-gray-900'
                    : ''
                }
                ${!isCurrentMonth ? 'text-gray-400' : ''}
                ${!isSelectable ? 'text-gray-300 cursor-not-allowed' : ''}
              `}
              aria-label={format(day, 'MMMM d, yyyy')}
              aria-pressed={isSelected}
            >
              {format(day, 'd')}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 border-2 border-primary-600 rounded"></div>
          <span>Today</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-primary-600 rounded"></div>
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
