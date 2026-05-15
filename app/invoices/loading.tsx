export default function Loading() {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      <div className="h-10 bg-gray-200 rounded-xl w-1/4"></div>
      <div className="card h-40 bg-gray-100 rounded-2xl w-full"></div>
      <div className="h-96 bg-gray-50 rounded-2xl w-full"></div>
    </div>
  );
}
