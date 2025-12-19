/**
 * Error Alert Component
 * 
 * Reusable error alert component for consistent error display across the app.
 */

interface ErrorAlertProps {
  /**
   * Error message to display
   */
  message: string;
  
  /**
   * Optional retry function
   */
  onRetry?: () => void;
  
  /**
   * Optional action button text
   * @default 'Retry'
   */
  actionText?: string;
}

export default function ErrorAlert({ 
  message, 
  onRetry,
  actionText = 'Retry'
}: ErrorAlertProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="alert alert-error">
        <span>{message}</span>
      </div>
      {onRetry && (
        <div className="text-center mt-4">
          <button 
            className="btn btn-primary"
            onClick={onRetry}
          >
            {actionText}
          </button>
        </div>
      )}
    </div>
  );
}
