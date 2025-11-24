import Link from 'next/link';
import Image from 'next/image';

interface RecipeCardProps {
  id: string;
  title: string;
  imageUrl?: string | null;
  description?: string | null;
  username: string;
  viewCount: number;
  tags?: string[];
}

export default function RecipeCard({
  id,
  title,
  imageUrl,
  description,
  username,
  viewCount,
  tags = [],
}: RecipeCardProps) {
  return (
    <Link href={`/recipe/${id}`} className="card bg-base-200 shadow-xl hover:shadow-2xl transition-shadow">
      <figure>
        <Image
          src={imageUrl || '/placeholder-recipe.jpg'}
          alt={title}
          width={400}
          height={300}
          className="w-full h-48 object-cover"
        />
      </figure>
      <div className="card-body">
        <h2 className="card-title">{title}</h2>
        {description && (
          <p className="text-sm opacity-70 line-clamp-2">{description}</p>
        )}
        <div className="card-actions justify-between items-center mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm opacity-60">by {username}</span>
            <span className="text-sm opacity-60">•</span>
            <span className="text-sm opacity-60">{viewCount} views</span>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="badge badge-outline badge-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

