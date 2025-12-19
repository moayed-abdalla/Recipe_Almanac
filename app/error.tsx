/**
 * Global Error Boundary
 * 
 * Catches errors in the application and displays a user-friendly error page.
 */

'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="alert alert-error">
        <span>Something went wrong!</span>
      </div>
      <div className="text-center mt-4">
        <button onClick={reset} className="btn btn-primary">
          Try again
        </button>
      </div>
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-4 p-4 bg-base-200 rounded">
          <p className="text-sm opacity-70">Error details:</p>
          <pre className="text-xs mt-2 overflow-auto">{error.message}</pre>
        </div>
      )}
    </div>
  );
}
