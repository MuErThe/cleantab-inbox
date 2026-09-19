/* The brand assets live in public/, so they are referenced through Vite's
   base URL and keep working under a non-root base path. Light and dark are
   swapped in CSS, so the wrong one never flashes. */

const base = import.meta.env.BASE_URL;

export function Logomark({
  className = '',
  alt = '',
}: {
  className?: string;
  alt?: string;
}) {
  const decorative = alt === '';
  return (
    <>
      <img
        src={`${base}logomark-light.svg`}
        alt={alt}
        aria-hidden={decorative || undefined}
        className={`logo-light ${className}`}
      />
      <img
        src={`${base}logomark-dark.svg`}
        alt={alt}
        aria-hidden={decorative || undefined}
        className={`logo-dark ${className}`}
      />
    </>
  );
}
