import React, { useState } from 'react';
import { generateTourLoadout, TourLoadoutInput, LoadoutItem, TourLoadoutResult } from '@/lib/merch/tourLoadout';
import { MerchAnalytics } from '@/lib/merch/types';
import { Package, Download } from 'lucide-react';

interface TourLoadoutGeneratorProps {
  analytics: MerchAnalytics;
  onExport?: (loadout: LoadoutItem[]) => void;
}

export const TourLoadoutGenerator: React.FC<TourLoadoutGeneratorProps> = ({ analytics, onExport }) => {
  const [cities, setCities] = useState('');
  const [attendance, setAttendance] = useState('500');
  const [season, setSeason] = useState<'Winter' | 'Spring' | 'Summer' | 'Fall'>('Spring');
  const [loadout, setLoadout] = useState<TourLoadoutResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = () => {
    setLoading(true);
    try {
      const cityList = cities.split('\n').filter((c) => c.trim());
      const numShows = cityList.length;

      const input: TourLoadoutInput = {
        cities: cityList,
        expectedAttendancePerShow: parseInt(attendance, 10),
        season,
        numberOfShows: numShows,
      };

      const result = generateTourLoadout(input, analytics);
      setLoadout(result);
    } catch (error) {
      console.error('Failed to generate loadout:', error);
    } finally {
      setLoading(false);
    }
  };

  const getConfidenceColor = (confidence: string) => {
    if (confidence === 'high') return 'text-green-400';
    if (confidence === 'medium') return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Tour Configuration</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cities (one per line)
            </label>
            <textarea
              value={cities}
              onChange={(e) => setCities(e.target.value)}
              rows={6}
              placeholder="Nashville
Austin
Denver"
              className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Expected Attendance
              </label>
              <input
                type="number"
                value={attendance}
                onChange={(e) => setAttendance(e.target.value)}
                placeholder="500"
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Season
              </label>
              <select
                value={season}
                onChange={(e) => setSeason(e.target.value as any)}
                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Winter">Winter</option>
                <option value="Spring">Spring</option>
                <option value="Summer">Summer</option>
                <option value="Fall">Fall</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {cities.split('\n').filter((c) => c.trim()).length} shows
          </div>
          <button
            onClick={handleGenerate}
            disabled={loading || !cities.trim() || !attendance}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Generating...' : 'Generate Loadout'}
          </button>
        </div>
      </div>

      {/* Loadout Results */}
      {loadout && loadout.items.length > 0 && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Total Items</div>
              <div className="text-3xl font-bold text-white">{loadout.summary.totalItems}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/20 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Unique Products</div>
              <div className="text-3xl font-bold text-white">{loadout.items.length}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Confidence</div>
              <div className={`text-3xl font-bold uppercase ${getConfidenceColor(loadout.confidence)}`}>
                {loadout.confidence}
              </div>
            </div>
            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
              <div className="text-sm text-gray-400 mb-1">Projected Revenue</div>
              <div className="text-2xl font-bold text-white">
                ${(loadout.summary.totalProjectedRevenue / 100).toLocaleString()}
              </div>
            </div>
          </div>

          {/* Notes */}
          {loadout.notes.length > 0 && (
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h4 className="text-sm font-semibold text-blue-400 mb-2">Important Notes:</h4>
              <ul className="space-y-1">
                {loadout.notes.map((note, i) => (
                  <li key={i} className="text-sm text-blue-300 flex items-start gap-2">
                    <span>•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Loadout Table */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg overflow-hidden">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Recommended Loadout</h3>
              {onExport && (
                <button
                  onClick={() => onExport(loadout.items)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900/50 border-b border-gray-700">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Product</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Type</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-400">Total Qty</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Size Breakdown</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-400">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {loadout.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                      <td className="px-4 py-3 text-white font-medium">{item.designName}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-1 rounded-full text-xs bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {item.garmentType}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-white font-semibold">{item.totalQuantity}</td>
                      <td className="px-4 py-3">
                        {item.sizeBreakdown && (
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(item.sizeBreakdown).map(([size, qty]) => (
                              <span
                                key={size}
                                className="inline-block px-2 py-0.5 rounded text-xs bg-gray-700 text-gray-300"
                              >
                                {size}: {qty}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.notes && item.notes.length > 0 && (
                          <div className="text-xs text-gray-400 space-y-0.5">
                            {item.notes.slice(0, 2).map((note, i) => (
                              <div key={i}>• {note}</div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loadout && (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <div className="text-gray-400">No loadout generated yet</div>
          <div className="text-sm text-gray-500 mt-2">
            Enter tour cities, expected attendance, and season to generate a recommended merch loadout
          </div>
        </div>
      )}
    </div>
  );
};
