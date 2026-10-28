"use client";

import { useState } from 'react';
import { Show } from '@/data/mockShows';

interface CalendarProps {
  shows: Show[];
}

export default function Calendar({ shows }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date(2025, 5, 26)); // Using the provided current time

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = Array.from({ length: 21 }, (_, i) => currentDate.getFullYear() - 10 + i);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handleMonthChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(currentDate.getFullYear(), parseInt(event.target.value), 1));
  };

  const handleYearChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentDate(new Date(parseInt(event.target.value), currentDate.getMonth(), 1));
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDayOfMonth = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`empty-${i}`} className="p-2"></div>);
    }

    // Add the days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const currentDateStr = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        day
      ).toISOString().split('T')[0];
      
      const dayShows = shows.filter(show => show.date === currentDateStr);
      
      days.push(
        <div key={day} className="p-2 hover:bg-[#262626] cursor-pointer text-white bg-[#1D1D1D] border border-[#434343] border-[1px] h-[100px] overflow-hidden">
          <div className="font-bold mb-1">{day}</div>
          {dayShows.map(show => (
            <div key={show.id} className="text-xs mb-1 bg-[#262626] p-1 rounded">
              <div className="font-semibold truncate">{show.showName}</div>
              <div className="text-gray-400 mt-0.5 truncate">
                {show.location.city}
                {show.location.state !== null && `, ${show.location.state}`}
                {show.location.country !== 'USA' && `, ${show.location.country}`}
              </div>
            </div>
          ))}
        </div>
      );
    }

    return days;
  };

  return (
    <div className="w-full">
      <div className="flex gap-4 mb-4">
        <select
          value={currentDate.getMonth()}
          onChange={handleMonthChange}
          className="background-[#262626] text-white border border-[#434343] rounded px-2 py-1 w-[190px]"
        >
          {months.map((month, index) => (
            <option key={month} value={index}>{month}</option>
          ))}
        </select>
        <select
          value={currentDate.getFullYear()}
          onChange={handleYearChange}
          className="background-[#1D1D1D] text-white border border-[#434343] rounded px-2 py-1 w-[90px]"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="font-semibold p-2 background-[yellow]">
            {day}
          </div>
        ))}
        {renderCalendar()}
      </div>
    </div>
  );
}