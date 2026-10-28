import React from 'react';
import { SizeBreakdown } from '@/lib/merch/types';

interface SizeAnalyticsProps {
  data: SizeBreakdown[];
}

export const SizeAnalytics: React.FC<SizeAnalyticsProps> = ({ data }) => {
  const totalItems = data.reduce((sum, item) => sum + item.quantity, 0);
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  
  const topSizes = [...data]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Items Sold</div>
          <div className="text-3xl font-bold text-white">{totalItems.toLocaleString()}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Unique Sizes</div>
          <div className="text-3xl font-bold text-white">{data.length}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Total Revenue</div>
          <div className="text-3xl font-bold text-white">${(totalRevenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Top Sizes */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Selling Sizes</h3>
        <div className="space-y-2">
          {topSizes.map((sizeData, index) => {
            const maxCount = topSizes[0].quantity;
            const percentage = (sizeData.quantity / maxCount) * 100;
            return (
              <div key={sizeData.size || 'N/A'} className="flex items-center gap-3">
                <div className="w-8 text-right text-gray-400 text-sm">#{index + 1}</div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-white font-medium">
                      {sizeData.size || 'N/A'}
                    </div>
                    <div className="text-gray-300">{sizeData.quantity} sold</div>
                  </div>
                  <div className="bg-gray-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All Sizes Table */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Size Distribution</h3>
        <div className="space-y-2">
          {data.map((sizeData) => (
            <div key={sizeData.size || 'N/A'} className="flex items-center gap-3">
              <div className="w-16 text-white font-medium">{sizeData.size || 'N/A'}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-sm text-gray-400">{sizeData.percentage.toFixed(1)}%</div>
                  <div className="text-sm text-gray-300">
                    {sizeData.quantity} items • ${(sizeData.revenue / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full transition-all duration-300"
                    style={{ width: `${sizeData.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
