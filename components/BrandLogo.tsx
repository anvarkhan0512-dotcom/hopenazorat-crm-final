'use client';

type Props = { variant?: 'sidebar' | 'hero' };

export default function BrandLogo({ variant = 'sidebar' }: Props) {
  const isHero = variant === 'hero';
  return (
    <div className={`brand-logo-wrap ${isHero ? 'brand-logo-wrap--hero' : ''}`}>
      <div className="brand-logo-line1">hopenazorat</div>
    </div>
  );
}
