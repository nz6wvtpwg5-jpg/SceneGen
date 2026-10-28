import React from 'react';
import { Recommendation } from '@/lib/merch/buildRecommendations';
import { AlertCircle, TrendingUp, MapPin, Calendar, Package } from 'lucide-react';

interface RecommendationsProps {
  recommendations: Recommendation[];
}

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'critical':
      return 'border-red-500/30 bg-red-500/10 text-red-400';
    case 'warning':
      return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
    case 'suggestion':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-400';
    case 'info':
      return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    default:
      return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
  }
};

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'size':
      return Package;
    case 'product':
      return TrendingUp;
    case 'regional':
      return MapPin;
    case 'seasonal':
      return Calendar;
    case 'inventory':
      return AlertCircle;
    default:
      return AlertCircle;
  }
};

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'size':
      return 'Size Optimization';
    case 'product':
      return 'Product Strategy';
    case 'regional':
      return 'Regional Insights';
    case 'seasonal':
      return 'Seasonal Planning';
    case 'inventory':
      return 'Inventory Management';
    default:
      return type;
  }
};

export const Recommendations: React.FC<RecommendationsProps> = ({ recommendations }) => {
  const groupedByType = recommendations.reduce((acc, rec) => {
    if (!acc[rec.type]) {
      acc[rec.type] = [];
    }
    acc[rec.type].push(rec);
    return acc;
  }, {} as Record<string, Recommendation[]>);

  const typeOrder = ['size', 'product', 'regional', 'seasonal', 'inventory'];
  const sortedTypes = Object.keys(groupedByType).sort(
    (a, b) => typeOrder.indexOf(a) - typeOrder.indexOf(b)
  );

  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-12 text-center">
        <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
        <div className="text-gray-400">No recommendations available</div>
        <div className="text-sm text-gray-500 mt-2">
          Recommendations will appear as you accumulate more sales data
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border border-red-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Critical</div>
          <div className="text-3xl font-bold text-white">
            {recommendations.filter((r) => r.severity === 'critical').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 border border-yellow-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Warning</div>
          <div className="text-3xl font-bold text-white">
            {recommendations.filter((r) => r.severity === 'warning').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Suggestion</div>
          <div className="text-3xl font-bold text-white">
            {recommendations.filter((r) => r.severity === 'suggestion').length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/20 rounded-lg p-4">
          <div className="text-sm text-gray-400 mb-1">Categories</div>
          <div className="text-3xl font-bold text-white">{sortedTypes.length}</div>
        </div>
      </div>

      {/* Recommendations by Type */}
      {sortedTypes.map((type) => {
        const Icon = getTypeIcon(type);
        const recs = groupedByType[type];

        return (
          <div key={type} className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Icon className="w-5 h-5 text-blue-400" />
              <h3 className="text-lg font-semibold text-white">{getTypeLabel(type)}</h3>
              <span className="text-sm text-gray-400">({recs.length})</span>
            </div>
            <div className="space-y-3">
              {recs.map((rec) => (
                <div
                  key={rec.id}
                  className={`border rounded-lg p-4 ${getSeverityColor(rec.severity)}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <div className="text-white font-medium">{rec.title}</div>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full bg-black/30 uppercase">
                      {rec.severity}
                    </span>
                  </div>
                  <div className="text-sm mb-3" style={{ color: 'inherit' }}>
                    {rec.description}
                  </div>
                  <div className="pt-3 border-t border-current/20">
                    <div className="text-xs font-semibold mb-1" style={{ color: 'inherit' }}>
                      Action:
                    </div>
                    <div className="text-sm" style={{ color: 'inherit' }}>
                      {rec.action}
                    </div>
                  </div>
                  {rec.confidence && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs" style={{ color: 'inherit' }}>
                        Confidence:
                      </span>
                      <div className="flex-1 bg-black/20 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-current h-full rounded-full"
                          style={{ width: `${rec.confidence}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'inherit' }}>
                        {rec.confidence}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
