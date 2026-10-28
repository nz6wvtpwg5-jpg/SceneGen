import React from 'react';
import { SeasonalAnalytics as SeasonalAnalyticsType, MonthlyAnalytics } from '@/lib/merch/types';

interface SeasonalAnalyticsProps {
  seasonal: SeasonalAnalyticsType[];
  monthly: MonthlyAnalytics[];
}

export const SeasonalAnalytics: React.FC<SeasonalAnalyticsProps> = ({ seasonal, monthly }) => {
  const totalRevenue = seasonal.reduce((sum, s) => sum + s.totalRevenue, 0);

  return (
    <div className="space-y-6">
      {/* Seasonal Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {seasonal.map((season) => {
          const revenuePercentage = (season.totalRevenue / totalRevenue) * 100;
          return (
            <div
              key={`${season.season}-${season.year}`}
              className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20 rounded-lg p-4"
            >
              <div className="text-sm text-gray-400 mb-1">{season.season} {season.year}</div>
              <div className="text-2xl font-bold text-white mb-2">
                ${(season.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-gray-400 mb-2">
                {season.totalSales} sales • {season.totalItems} items
              </div>
              <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${revenuePercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Seasonal Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {seasonal.map((season) => (
          <div
            key={`${season.season}-${season.year}`}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-white mb-4">
              {season.season} {season.year} - Top Products
            </h3>
            <div className="space-y-2">
              {season.topProducts.slice(0, 5).map((product, idx) => {
                const maxRevenue = season.topProducts[0].revenue;
                const percentage = (product.revenue / maxRevenue) * 100;
                return (
                  <div key={product.designId} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-gray-500">#{idx + 1}</div>
                        <div className="text-sm text-white">{product.designName}</div>
                      </div>
                      <div className="text-sm text-gray-300">
                        {product.quantity} • ${(product.revenue / 100).toLocaleString()}
                      </div>
                    </div>
                    <div className="bg-gray-700 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Monthly Breakdown */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Monthly Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Month</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Sales</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Items</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Revenue</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Avg Order</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Top Product</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {monthly.map((month) => (
                <tr key={month.month} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-white font-medium">{month.monthName}</td>
                  <td className="px-4 py-3 text-right text-white">{month.totalSales}</td>
                  <td className="px-4 py-3 text-right text-gray-300">{month.totalItems}</td>
                  <td className="px-4 py-3 text-right text-white">
                    ${(month.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-300">
                    ${(month.averageOrderValue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-4 py-3">
                    {month.topProducts[0] && (
                      <div className="text-sm text-gray-300">
                        {month.topProducts[0].designName}
                        <span className="text-xs text-gray-500 ml-1">
                          ({month.topProducts[0].quantity})
                        </span>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
