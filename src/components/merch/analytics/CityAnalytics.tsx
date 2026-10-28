import React, { useState } from 'react';
import { CityAnalytics as CityAnalyticsType } from '@/lib/merch/types';

interface CityAnalyticsProps {
  data: CityAnalyticsType[];
}

type SortKey = 'revenue' | 'sales' | 'avgPerShow' | 'city';

export const CityAnalytics: React.FC<CityAnalyticsProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<SortKey>('revenue');
  const [limit, setLimit] = useState(20);

  const totalRevenue = data.reduce((sum, c) => sum + c.totalRevenue, 0);
  const totalSales = data.reduce((sum, c) => sum + c.totalSales, 0);

  const sortedCities = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.totalRevenue - a.totalRevenue;
      case 'sales':
        return b.totalSales - a.totalSales;
      case 'avgPerShow':
        return b.averagePerShow - a.averagePerShow;
      case 'city':
        return a.city.localeCompare(b.city);
      default:
        return 0;
    }
  });

  const displayedCities = sortedCities.slice(0, limit);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Cities</div>
          <div className="text-3xl font-bold text-white">{data.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Sales</div>
          <div className="text-3xl font-bold text-white">{totalSales.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Revenue</div>
          <div className="text-3xl font-bold text-white">
            ${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="revenue">Revenue</option>
            <option value="sales">Sales Count</option>
            <option value="avgPerShow">Avg Per Show</option>
            <option value="city">City Name</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-400">Show:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={50}>Top 50</option>
            <option value={data.length}>All</option>
          </select>
        </div>
      </div>

      {/* Cities Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">City</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Shows</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Sales</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Items</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Revenue</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Avg/Show</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {displayedCities.map((city, index) => {
                const revenuePercentage = (city.totalRevenue / totalRevenue) * 100;
                return (
                  <tr key={`${city.city}-${city.state}`} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-sm">#{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{city.city}</div>
                      <div className="text-xs text-gray-400">{city.state}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-white">{city.totalShows}</td>
                    <td className="px-4 py-3 text-right text-white">{city.totalSales}</td>
                    <td className="px-4 py-3 text-right text-gray-300">{city.totalItems}</td>
                    <td className="px-4 py-3 text-right text-white">
                      ${(city.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-white">
                      ${(city.averagePerShow / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="text-white font-medium">{revenuePercentage.toFixed(1)}%</div>
                        <div className="w-16 bg-gray-700 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-green-500 h-full rounded-full"
                            style={{ width: `${Math.min(revenuePercentage, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Products by City - Top 5 Cities */}
      {displayedCities.slice(0, 5).length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Products by City - Top 5</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {displayedCities.slice(0, 5).map((city) => (
              <div key={`${city.city}-${city.state}`} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <div className="text-white font-medium mb-3">
                  {city.city}, {city.state}
                </div>
                <div className="space-y-2">
                  {city.topProducts.slice(0, 5).map((product, idx) => (
                    <div key={product.designId} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">#{idx + 1}</div>
                        <div className="text-sm text-gray-300">{product.designName}</div>
                      </div>
                      <div className="text-sm text-white">{product.quantity}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
