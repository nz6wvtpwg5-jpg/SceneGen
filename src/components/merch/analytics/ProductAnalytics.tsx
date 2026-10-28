import React, { useState } from 'react';
import { MerchDesign } from '@/lib/merch/types';

interface ProductAnalyticsProps {
  data: MerchDesign[];
}

type SortKey = 'revenue' | 'quantity' | 'name';

export const ProductAnalytics: React.FC<ProductAnalyticsProps> = ({ data }) => {
  const [sortBy, setSortBy] = useState<SortKey>('revenue');
  const [limit, setLimit] = useState(20);

  const totalRevenue = data.reduce((sum, p) => sum + p.totalRevenue, 0);
  const totalSold = data.reduce((sum, p) => sum + p.totalSold, 0);

  const sortedProducts = [...data].sort((a, b) => {
    switch (sortBy) {
      case 'revenue':
        return b.totalRevenue - a.totalRevenue;
      case 'quantity':
        return b.totalSold - a.totalSold;
      case 'name':
        return a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  const displayedProducts = sortedProducts.slice(0, limit);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Products</div>
          <div className="text-3xl font-bold text-white">{data.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Sold</div>
          <div className="text-3xl font-bold text-white">{totalSold.toLocaleString()}</div>
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
            <option value="quantity">Quantity Sold</option>
            <option value="name">Name</option>
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

      {/* Products Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50 border-b border-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Rank</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Product</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Type</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Quantity</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Revenue</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Avg Price</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">% of Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {displayedProducts.map((product, index) => {
                const revenuePercentage = (product.totalRevenue / totalRevenue) * 100;
                return (
                  <tr key={product.id} className="hover:bg-gray-800/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-sm">#{index + 1}</td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{product.name}</div>
                      <div className="text-xs text-gray-400">{product.category}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        {product.garmentType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-white">{product.totalSold}</td>
                    <td className="px-4 py-3 text-right text-white">
                      ${(product.totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-300">
                      ${(product.averagePrice / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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

      {/* Size Breakdown for Top Products */}
      {displayedProducts.slice(0, 5).length > 0 && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Size Breakdown - Top 5 Products</h3>
          <div className="space-y-4">
            {displayedProducts.slice(0, 5).map((product) => (
              <div key={product.id}>
                <div className="text-white font-medium mb-2">{product.name}</div>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {product.sizes.map((size) => (
                    <div
                      key={size.size || 'N/A'}
                      className="bg-gray-900/50 border border-gray-700 rounded px-3 py-2"
                    >
                      <div className="text-xs text-gray-400">{size.size || 'N/A'}</div>
                      <div className="text-sm text-white font-medium">{size.quantity}</div>
                      <div className="text-xs text-gray-500">{size.percentage.toFixed(0)}%</div>
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
