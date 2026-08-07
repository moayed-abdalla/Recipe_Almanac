'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';

export type RemixTreeNodeData = {
  slug: string;
  title: string;
  username: string;
  is_current: boolean;
  onNavigate?: (slug: string) => void;
};

export type RemixTreeFlowNode = Node<RemixTreeNodeData, 'remix'>;

function RemixTreeNodeComponent({ data }: NodeProps<RemixTreeFlowNode>) {
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
        'w-[160px] rounded-md border bg-base-100 px-2.5 py-2 shadow-sm transition-shadow',
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
        className="!bg-primary !border-primary !w-1.5 !h-1.5"
      />
      {data.is_current && (
        <p className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
          You are here
        </p>
      )}
      <p className="text-sm font-semibold leading-snug line-clamp-2 special-elite-regular">
        {data.title}
      </p>
      <p className="mt-0.5 text-xs text-base-content/60 truncate">@{data.username}</p>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-primary !border-primary !w-1.5 !h-1.5"
      />
    </div>
  );
}

export default memo(RemixTreeNodeComponent);
