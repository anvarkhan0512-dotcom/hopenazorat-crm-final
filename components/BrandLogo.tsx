'use client';

type Props = { variant?: 'sidebar' | 'hero'; tagline?: string; showText?: boolean };

export default function BrandLogo({ variant = 'sidebar', tagline, showText = true }: Props) {
  const isHero = variant === 'hero';
  return (
    <div className={`brand-logo-wrap ${isHero ? 'brand-logo-wrap--hero' : ''}`}>
      <div className="brand-logo-line1">{showText ? 'Hope Study' : 'HS'}</div>
      {tagline && showText ? (
        <p className={`brand-logo-tagline ${isHero ? 'brand-logo-tagline--hero' : ''}`}>{tagline}</p>
      ) : null}
    </div>
  );
}
