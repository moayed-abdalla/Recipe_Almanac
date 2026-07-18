'use client';

import Image from 'next/image';
import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { getRecipeCardImageUrl } from '@/utils/recipeImage';

export type RemixTreeNodeData = {
  slug: string;
  title: string;
  image_url: string | null;
  username: string;
  is_current: boolean;
  onNavigate?: (slug: string) => void;
};

export type RemixTreeFlowNode = Node<RemixTreeNodeData, 'remix'>;

function RemixTreeNodeComponent({ data }: NodeProps<RemixTreeFlowNode>) {
  const thumbUrl = data.image_url
    ? getRecipeCardImageUrl(data.image_url) ?? data.image_url
    : null;

  const handleActivate = () => {
    if (data.is_current || !data.onNavigate) return;
    data.onNavigate(data.slug);
  };

  return (
    <div
      role={data.is_current ? undefined : 'button'}
      tabIndex={data.is_current ? undefined : 0}
      onClick={handleActivate}
      onKeyDown={(e) => {
        if (data.is_current) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleActivate();
        }
      }}
      className={[
        'w-[168px] rounded-lg border bg-base-100 shadow-sm overflow-hidden transition-shadow',
        data.is_current
          ? 'border-primary ring-2 ring-primary/40 cursor-default'
          : 'border-base-300 hover:border-primary/50 hover:shadow-md cursor-pointer',
      ].join(' ')}
      aria-current={data.is_current ? 'page' : undefined}
      aria-label={
        data.is_current
          ? `${data.title} (current recipe)`
          : `Open ${data.title} by ${data.username}`
      }
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-primary !border-primary !w-2 !h-2"
      />
      <div className="relative h-20 w-full bg-base-200">
        {thumbUrl ? (
          <Image
            src={thumbUrl}
            alt=""
            fill
            className="object-cover"
            sizes="168px"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-base-content/30">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
          </div>
        )}
        {data.is_current && (
          <span className="absolute top-1.5 left-1.5 badge badge-primary badge-sm font-medium">
            You are here
          </span>
        )}
      </div>
      <div className="px-2.5 py-2">
        <p className="text-sm font-semibold leading-snug line-clamp-2 special-elite-regular">
          {data.title}
        </p>
        <p className="mt-0.5 text-xs text-base-content/60 truncate">@{data.username}</p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-primary !w-2 !h-2"
      />
    </div>
  );
}

export default memo(RemixTreeNodeComponent);
