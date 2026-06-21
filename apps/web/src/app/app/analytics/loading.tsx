export default function AnalyticsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="mx-auto max-w-4xl p-4 md:p-6">
        <div className="space-y-4">
          <div className="h-7 w-40 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            ))}
          </div>
          <div className="h-56 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-56 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            <div className="h-56 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          </div>
        </div>
      </div>
    </div>
  )
}

