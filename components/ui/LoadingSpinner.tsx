/**
 * Loading Spinner Component
 * 
 * Reusable loading spinner component for consistent loading states across the app.
 */

interface LoadingSpinnerProps {
  /**
   * Size of the spinner
   * @default 'lg'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Custom message to display below spinner
   */
  message?: string;
  
  /**
   * Minimum height for the container
   * @default '400px'
   */
  minHeight?: string;
}

export default function LoadingSpinner({ 
  size = 'lg', 
  message,
  minHeight = '400px' 
}: LoadingSpinnerProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div 
        className="flex flex-col justify-center items-center gap-4"
        style={{ minHeight }}
      >
        <span className={`loading loading-spinner loading-${size}`}></span>
        {message && (
          <p className="text-lg opacity-70">{message}</p>
        )}
      </div>
    </div>
  );
}
