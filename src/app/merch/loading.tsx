export default function Loading() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div>
          <div className="h-8 w-48 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 w-96 bg-gray-700 rounded"></div>
        </div>
        <div className="flex gap-2">
          <div className="h-10 w-40 bg-gray-700 rounded"></div>
          <div className="h-10 w-32 bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-gray-700 rounded-lg p-6">
            <div className="h-4 w-24 bg-gray-700 rounded mb-4"></div>
            <div className="h-8 w-16 bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="space-y-4">
        <div className="flex gap-2">
          <div className="h-10 w-24 bg-gray-700 rounded"></div>
          <div className="h-10 w-24 bg-gray-700 rounded"></div>
          <div className="h-10 w-32 bg-gray-700 rounded"></div>
        </div>
        <div className="border border-gray-700 rounded-lg p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  );
}
