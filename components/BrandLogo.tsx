'use client';

import { useCenter } from '@/lib/center-context';

type Props = { variant?: 'sidebar' | 'hero'; tagline?: string; showText?: boolean };

export default function BrandLogo({ variant = 'sidebar', tagline, showText = true }: Props) {
  const { centerName } = useCenter();
  const isHero = variant === 'hero';
  
  const initials = centerName
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className={`brand-logo-wrap ${isHero ? 'brand-logo-wrap--hero' : ''}`}>
      <div className="brand-logo-line1">{showText ? centerName : initials}</div>
      {tagline && showText ? (
        <p className={`brand-logo-tagline ${isHero ? 'brand-logo-tagline--hero' : ''}`}>{tagline}</p>
      ) : null}
    </div>
  );
}
