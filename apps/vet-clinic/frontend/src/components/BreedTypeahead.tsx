import { useState, useRef, useEffect } from 'react';
import { searchBreeds, type BreedInfo } from '../data/breeds';

interface BreedTypeaheadProps {
  species: string;
  value: string;
  onChange: (breed: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function BreedTypeahead({
  species,
  value,
  onChange,
  placeholder = 'Start typing to search breeds...',
  disabled = false,
  className = '',
}: BreedTypeaheadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<BreedInfo[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Update query when value prop changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  // Search breeds when query or species changes
  useEffect(() => {
    if (species) {
      const searchResults = searchBreeds(species, query);
      setResults(searchResults);
      setHighlightedIndex(0);
    } else {
      setResults([]);
    }
  }, [query, species]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelectBreed = (breed: BreedInfo) => {
    setQuery(breed.name);
    onChange(breed.name);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (results[highlightedIndex]) {
          handleSelectBreed(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleFocus = () => {
    if (species) {
      setIsOpen(true);
    }
  };

  const handleBlur = (_e: React.FocusEvent) => {
    // Delay closing to allow click on option
    setTimeout(() => {
      if (!listRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
      }
    }, 150);
  };

  if (!species) {
    return (
      <input
        type="text"
        disabled
        placeholder="Select a species first"
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed ${className}`}
      />
    );
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 ${
          disabled ? 'bg-gray-100 cursor-not-allowed' : ''
        } ${className}`}
        autoComplete="off"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-autocomplete="list"
        role="combobox"
      />

      {/* Dropdown icon */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Results dropdown */}
      {isOpen && results.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
          role="listbox"
        >
          {results.map((breed, index) => (
            <li
              key={breed.name}
              onClick={() => handleSelectBreed(breed)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-4 py-2 cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-primary-100 text-primary-900'
                  : 'hover:bg-gray-50'
              }`}
              role="option"
              aria-selected={index === highlightedIndex}
            >
              <span className="font-medium">{breed.name}</span>
              {breed.aliases && breed.aliases.length > 0 && (
                <span className="ml-2 text-sm text-gray-500">
                  ({breed.aliases.join(', ')})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* No results message */}
      {isOpen && query && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4 text-center text-gray-500">
          No breeds found matching "{query}"
          <button
            type="button"
            onClick={() => {
              onChange(query);
              setIsOpen(false);
            }}
            className="block mx-auto mt-2 text-sm text-primary-600 hover:text-primary-700"
          >
            Use "{query}" anyway
          </button>
        </div>
      )}
    </div>
  );
}
