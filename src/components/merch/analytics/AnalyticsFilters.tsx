/**
 * SceneGen Merch Analytics - Analytics Filters
 * Global filter component for all analytics views
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X, CalendarIcon, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ProductCategory, GarmentType } from '@/lib/merch/types';

export interface AnalyticsFilterState {
  dateRange?: { start: Date; end: Date };
  cities: string[];
  countries: string[];
  categories: ProductCategory[];
  garmentTypes: GarmentType[];
}

interface AnalyticsFiltersProps {
  availableCities: string[];
  availableCountries: string[];
  filters: AnalyticsFilterState;
  onFiltersChange: (filters: AnalyticsFilterState) => void;
}

export function AnalyticsFilters({
  availableCities,
  availableCountries,
  filters,
  onFiltersChange,
}: AnalyticsFiltersProps) {
  const [showFilters, setShowFilters] = useState(false);

  const handleDateRangeChange = (range: { start: Date; end: Date } | undefined) => {
    onFiltersChange({ ...filters, dateRange: range });
  };

  const handleCityToggle = (city: string) => {
    const newCities = filters.cities.includes(city)
      ? filters.cities.filter(c => c !== city)
      : [...filters.cities, city];
    onFiltersChange({ ...filters, cities: newCities });
  };

  const handleCountryToggle = (country: string) => {
    const newCountries = filters.countries.includes(country)
      ? filters.countries.filter(c => c !== country)
      : [...filters.countries, country];
    onFiltersChange({ ...filters, countries: newCountries });
  };

  const handleCategoryToggle = (category: ProductCategory) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFiltersChange({ ...filters, categories: newCategories });
  };

  const handleGarmentTypeToggle = (type: GarmentType) => {
    const newTypes = filters.garmentTypes.includes(type)
      ? filters.garmentTypes.filter(t => t !== type)
      : [...filters.garmentTypes, type];
    onFiltersChange({ ...filters, garmentTypes: newTypes });
  };

  const handleClearAll = () => {
    onFiltersChange({
      dateRange: undefined,
      cities: [],
      countries: [],
      categories: [],
      garmentTypes: [],
    });
  };

  const activeFilterCount =
    (filters.dateRange ? 1 : 0) +
    filters.cities.length +
    filters.countries.length +
    filters.categories.length +
    filters.garmentTypes.length;

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="active" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear All
          </Button>
        )}
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/50">
          {/* Date Range - Simplified to text inputs */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <div className="flex gap-2">
              <input
                type="date"
                value={filters.dateRange?.start ? filters.dateRange.start.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value) {
                    const newStart = new Date(e.target.value);
                    onFiltersChange({
                      ...filters,
                      dateRange: {
                        start: newStart,
                        end: filters.dateRange?.end || newStart,
                      },
                    });
                  } else if (filters.dateRange) {
                    onFiltersChange({
                      ...filters,
                      dateRange: undefined,
                    });
                  }
                }}
                className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="Start date"
              />
              <input
                type="date"
                value={filters.dateRange?.end ? filters.dateRange.end.toISOString().split('T')[0] : ''}
                onChange={(e) => {
                  if (e.target.value && filters.dateRange?.start) {
                    const newEnd = new Date(e.target.value);
                    onFiltersChange({
                      ...filters,
                      dateRange: {
                        start: filters.dateRange.start,
                        end: newEnd,
                      },
                    });
                  }
                }}
                className="flex-1 px-3 py-2 border rounded-md bg-background text-sm"
                placeholder="End date"
                disabled={!filters.dateRange?.start}
              />
            </div>
            {filters.dateRange && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
                className="w-full text-xs"
              >
                Clear dates
              </Button>
            )}
          </div>

          {/* Cities */}
          {availableCities.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Cities</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select cities..." />
                </SelectTrigger>
                <SelectContent>
                  {availableCities.map(city => (
                    <SelectItem
                      key={city}
                      value={city}
                      onClick={() => handleCityToggle(city)}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={filters.cities.includes(city)}
                          readOnly
                          className="h-4 w-4"
                        />
                        {city}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {filters.cities.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {filters.cities.map(city => (
                    <Badge key={city} variant="outline" className="gap-1">
                      {city}
                      <button type="button" aria-label={`Remove ${city} filter`}
                        onClick={() => handleCityToggle(city)}
                        className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:text-destructive"
                      >
                        <X aria-hidden="true" className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Categories */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Categories</label>
            <div className="space-y-1">
              {(['apparel', 'music', 'accessories', 'art'] as ProductCategory[]).map(category => (
                <label key={category} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category)}
                    onChange={() => handleCategoryToggle(category)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm capitalize">{category}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Garment Types */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Types</label>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {([
                'tshirt',
                'longsleeve',
                'hoodie',
                'crewneck',
                'vinyl',
                'cd',
                'poster',
                'hat',
                'beanie',
              ] as GarmentType[]).map(type => (
                <label key={type} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.garmentTypes.includes(type)}
                    onChange={() => handleGarmentTypeToggle(type)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm capitalize">{type.replace(/([A-Z])/g, ' $1').trim()}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Active Filters Display */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-2">
          {filters.dateRange && (
            <Badge variant="outline" className="gap-1">
              {filters.dateRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {filters.dateRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              <button type="button" aria-label="Remove date filter"
                onClick={() => onFiltersChange({ ...filters, dateRange: undefined })}
                className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:text-destructive"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.cities.map(city => (
            <Badge key={city} variant="outline" className="gap-1">
              {city}
              <button type="button" aria-label={`Remove ${city} filter`}
                onClick={() => handleCityToggle(city)}
                className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:text-destructive"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.categories.map(category => (
            <Badge key={category} variant="outline" className="gap-1">
              {category}
              <button type="button" aria-label={`Remove ${category} filter`}
                onClick={() => handleCategoryToggle(category)}
                className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:text-destructive"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {filters.garmentTypes.map(type => (
            <Badge key={type} variant="outline" className="gap-1">
              {type}
              <button type="button" aria-label={`Remove ${type} filter`}
                onClick={() => handleGarmentTypeToggle(type)}
                className="ml-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full hover:text-destructive"
              >
                <X aria-hidden="true" className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
