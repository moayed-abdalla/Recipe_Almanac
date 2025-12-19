/**
 * Empty State Component
 * 
 * Reusable empty state component for displaying when no data is available.
 */

import Link from 'next/link';

interface EmptyStateProps {
  /**
   * Message to display
   */
  message: string;
  
  /**
   * Optional action button
   */
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export default function EmptyState({ message, action }: EmptyStateProps) {
  const ActionButton = action?.href ? (
    <Link href={action.href} className="btn btn-primary">
      {action.label}
    </Link>
  ) : action?.onClick ? (
    <button onClick={action.onClick} className="btn btn-primary">
      {action.label}
    </button>
  ) : null;

  return (
    <div className="text-center py-12">
      <p className="text-lg opacity-70 mb-4">{message}</p>
      {ActionButton}
    </div>
  );
}
