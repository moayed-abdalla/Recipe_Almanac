import Link from 'next/link';
import {
  formatCopyAttributionText,
  getRecipeUrl,
  type RecipeCopySource,
} from '@/lib/recipeCopyAttribution';

type RecipeCopyAttributionNoteProps = {
  source: RecipeCopySource;
  variant?: 'list' | 'print' | 'pdfText';
  siteUrl?: string;
  className?: string;
};

export default function RecipeCopyAttributionNote({
  source,
  variant = 'list',
  siteUrl,
  className = '',
}: RecipeCopyAttributionNoteProps) {
  if (variant === 'pdfText') {
    return <>{formatCopyAttributionText(source, siteUrl)}</>;
  }

  if (variant === 'print') {
    return (
      <span className={className}>
        Copied from{' '}
        <span className="font-medium">{source.title}</span>
        {' — '}
        {getRecipeUrl(source.slug, siteUrl)}
      </span>
    );
  }

  return (
    <span className={className}>
      Copied from{' '}
      <Link href={`/recipe/${source.slug}`} className="link link-primary">
        {source.title}
      </Link>
    </span>
  );
}
