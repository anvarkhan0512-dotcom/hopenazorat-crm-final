export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-10 bg-gray-200 rounded-xl w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-48 bg-gray-100 rounded-2xl w-full"></div>
        ))}
      </div>
    </div>
  );
}
