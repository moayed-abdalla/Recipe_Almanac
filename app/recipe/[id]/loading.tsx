/**
 * Recipe detail route loading skeleton.
 *
 * Shown instantly while the Server Component fetches recipe data, so the user
 * sees the page shape immediately instead of a blank screen.
 */
export default function RecipeLoading() {
  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8 max-w-4xl">
      <div className="skeleton mb-4 sm:mb-6 lg:mb-8 h-56 sm:h-72 lg:h-96 w-full rounded-lg" />

      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex-1 space-y-3">
          <div className="skeleton h-8 w-3/4" />
          <div className="skeleton h-4 w-1/3" />
        </div>
        <div className="flex gap-2">
          <div className="skeleton h-12 w-12 rounded-full" />
          <div className="skeleton h-12 w-12 rounded-full" />
        </div>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="skeleton h-6 w-16 rounded-full" />
        <div className="skeleton h-6 w-20 rounded-full" />
        <div className="skeleton h-6 w-14 rounded-full" />
      </div>

      <div className="space-y-2 mb-8">
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-full" />
        <div className="skeleton h-4 w-2/3" />
      </div>

      <div className="mb-8 space-y-3">
        <div className="skeleton h-7 w-40" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-5 w-full" />
        ))}
      </div>

      <div className="space-y-3">
        <div className="skeleton h-7 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-6 w-full" />
        ))}
      </div>
    </div>
  );
}
