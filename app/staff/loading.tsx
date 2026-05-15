export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-10 bg-gray-200 rounded-xl w-1/4"></div>
        <div className="h-10 bg-gray-200 rounded-xl w-32"></div>
      </div>
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-50 rounded-xl w-full"></div>
        ))}
      </div>
    </div>
  );
}
