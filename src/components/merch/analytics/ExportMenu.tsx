import React, { useState } from 'react';
import { Download, FileText, Table } from 'lucide-react';
import { MerchAnalytics } from '@/lib/merch/types';
import { TourLoadoutResult } from '@/lib/merch/tourLoadout';
import { Recommendation } from '@/lib/merch/buildRecommendations';
import {
  exportCompleteOverview,
  exportSizeDistribution,
  exportProductRankings,
  exportCityPerformance,
  exportSeasonalSummary,
  exportRecommendations,
  exportTourLoadout,
} from '@/lib/merch/exportCsv';

interface ExportMenuProps {
  analytics: MerchAnalytics;
  recommendations?: Recommendation[];
  tourLoadout?: TourLoadoutResult;
}

export const ExportMenu: React.FC<ExportMenuProps> = ({
  analytics,
  recommendations,
  tourLoadout,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleExport = (type: string) => {
    try {
      switch (type) {
        case 'all':
          exportCompleteOverview(analytics);
          break;
        case 'size':
          exportSizeDistribution(analytics);
          break;
        case 'product':
          exportProductRankings(analytics);
          break;
        case 'city':
          exportCityPerformance(analytics);
          break;
        case 'seasonal':
          exportSeasonalSummary(analytics);
          break;
        case 'recommendations':
          if (recommendations) {
            exportRecommendations(recommendations);
          }
          break;
        case 'loadout':
          if (tourLoadout) {
            exportTourLoadout(tourLoadout);
          }
          break;
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        <Download className="w-4 h-4" />
        Export Data
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 overflow-hidden">
            <div className="p-2 border-b border-gray-700">
              <div className="text-xs font-semibold text-gray-400 px-2 py-1">
                EXPORT OPTIONS
              </div>
            </div>
            <div className="p-1">
              <button
                onClick={() => handleExport('all')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition-colors text-left"
              >
                <Table className="w-4 h-4 text-blue-400" />
                <div>
                  <div className="text-sm font-medium text-white">Full Analytics</div>
                  <div className="text-xs text-gray-400">All analytics data</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('size')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-green-400" />
                <div>
                  <div className="text-sm font-medium text-white">Size Analytics</div>
                  <div className="text-xs text-gray-400">Size breakdown data</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('product')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-sm font-medium text-white">Product Analytics</div>
                  <div className="text-xs text-gray-400">Product performance</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('city')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-yellow-400" />
                <div>
                  <div className="text-sm font-medium text-white">City Analytics</div>
                  <div className="text-xs text-gray-400">City-level data</div>
                </div>
              </button>

              <button
                onClick={() => handleExport('seasonal')}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition-colors text-left"
              >
                <FileText className="w-4 h-4 text-orange-400" />
                <div>
                  <div className="text-sm font-medium text-white">Seasonal Analytics</div>
                  <div className="text-xs text-gray-400">Seasonal & monthly data</div>
                </div>
              </button>

              {recommendations && recommendations.length > 0 && (
                <>
                  <div className="h-px bg-gray-700 my-1" />
                  <button
                    onClick={() => handleExport('recommendations')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-red-400" />
                    <div>
                      <div className="text-sm font-medium text-white">Recommendations</div>
                      <div className="text-xs text-gray-400">Actionable insights</div>
                    </div>
                  </button>
                </>
              )}

              {tourLoadout && tourLoadout.items.length > 0 && (
                <>
                  <div className="h-px bg-gray-700 my-1" />
                  <button
                    onClick={() => handleExport('loadout')}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-gray-700 transition-colors text-left"
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-sm font-medium text-white">Tour Loadout</div>
                      <div className="text-xs text-gray-400">Packing list</div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
