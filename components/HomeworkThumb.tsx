'use client';

import Image from 'next/image';
import { memo } from 'react';

type Props = { src: string; alt: string; className?: string };

function HomeworkThumbInner({ src, alt, className }: Props) {
  if (!src) return null;
  const external = /^https?:\/\//i.test(src);
  return (
    <div className={`relative h-24 w-32 shrink-0 overflow-hidden rounded border bg-gray-50 ${className || ''}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes="128px"
        className="object-cover"
        unoptimized={external}
      />
    </div>
  );
}

export const HomeworkThumb = memo(HomeworkThumbInner);
