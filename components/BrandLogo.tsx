'use client';

type Props = { variant?: 'sidebar' | 'hero'; tagline?: string };

export default function BrandLogo({ variant = 'sidebar', tagline }: Props) {
  const isHero = variant === 'hero';
  return (
    <div className={`brand-logo-wrap ${isHero ? 'brand-logo-wrap--hero' : ''}`}>
      <div className="brand-logo-line1">Hope Study</div>
      {tagline ? (
        <p className={`brand-logo-tagline ${isHero ? 'brand-logo-tagline--hero' : ''}`}>{tagline}</p>
      ) : null}
    </div>
  );
}
