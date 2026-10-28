"use client";

import { Show } from '@/data/mockShows';
import { useState, useMemo, useEffect } from 'react';

interface ShowsFilterProps {
  shows: Show[];
  onFilterChange: (filteredShows: Show[]) => void;
}

export default function ShowsFilter({ shows, onFilterChange }: ShowsFilterProps) {
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedCity, setSelectedCity] = useState<string>('');
  const [selectedVenue, setSelectedVenue] = useState<string>('');
  const [selectedTour, setSelectedTour] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const clearFilters = () => {
    setSelectedYear('');
    setSelectedMonth('');
    setSelectedCity('');
    setSelectedVenue('');
    setSelectedTour('');
    setSearchQuery('');
  };

  // Extract unique values for each filter
  const filterOptions = useMemo(() => {
    const years = new Set<string>();
    const months = new Set<string>();
    const cities = new Set<string>();
    const venues = new Set<string>();
    const tours = new Set<string>();

    shows.forEach(show => {
      const date = new Date(show.date);
      years.add(date.getFullYear().toString());
      months.add(date.toLocaleString('default', { month: 'long' }));
      cities.add(show.location.city);
      venues.add(show.venue);
      tours.add(show.showName);
    });

    return {
      years: Array.from(years).sort(),
      months: Array.from(months),
      cities: Array.from(cities).sort(),
      venues: Array.from(venues).sort(),
      tours: Array.from(tours).sort()
    };
  }, [shows]);

  // Filter shows based on selected criteria
  const filterShows = useMemo(() => {
    return shows.filter(show => {
      const date = new Date(show.date);
      const matchesYear = !selectedYear || date.getFullYear().toString() === selectedYear;
      const matchesMonth = !selectedMonth || date.toLocaleString('default', { month: 'long' }) === selectedMonth;
      const matchesCity = !selectedCity || show.location.city === selectedCity;
      const matchesVenue = !selectedVenue || show.venue === selectedVenue;
      const matchesTour = !selectedTour || show.showName === selectedTour;
      const matchesSearch = !searchQuery || 
        show.showName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.venue.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.location.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        show.lineup.some(band => band.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesYear && matchesMonth && matchesCity && matchesVenue && matchesTour && matchesSearch;
    });
  }, [shows, selectedYear, selectedMonth, selectedCity, selectedVenue, selectedTour, searchQuery]);

  // Update filtered shows whenever filters change
  useEffect(() => {
    onFilterChange(filterShows);
  }, [filterShows, onFilterChange]);

  const renderSelect = (
    value: string,
    onChange: (value: string) => void,
    options: string[],
    placeholder: string
  ) => (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#1D1D1D] text-white border border-[#434343] rounded px-2 py-1 text-sm"
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  );

  return (
    <div className="flex gap-2 mb-4 items-center">
      {renderSelect(selectedYear, setSelectedYear, filterOptions.years, "All Years")}
      {renderSelect(selectedMonth, setSelectedMonth, filterOptions.months, "All Months")}
      {renderSelect(selectedCity, setSelectedCity, filterOptions.cities, "All Cities")}
      {renderSelect(selectedVenue, setSelectedVenue, filterOptions.venues, "All Venues")}
      {renderSelect(selectedTour, setSelectedTour, filterOptions.tours, "All Tours")}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search..."
        className="bg-[#1D1D1D] text-white border border-[#434343] rounded px-2 py-1 text-sm flex-1"
      />
      <button
        onClick={clearFilters}
        className="bg-[#262626] text-white border border-[#434343] rounded px-3 py-1 text-sm hover:bg-[#333333] transition-colors"
      >
        Clear Filters
      </button>
    </div>
  );
}
