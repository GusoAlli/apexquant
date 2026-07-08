/**
 * BrandIcon — loads brand logo SVGs from /public/icons/brands/{name}.svg
 *
 * HOW TO ADD / REPLACE AN ICON:
 *  1. Download the official SVG from the brand's website or Simple Icons (simpleicons.org)
 *  2. Save it to:  frontend/public/icons/brands/{name}.svg
 *     where {name} matches the `name` prop you pass here (lowercase, no spaces).
 *  3. No code changes needed — the component picks it up automatically.
 *
 * Examples:
 *   <BrandIcon name="hyperliquid" size={20} />
 *   <BrandIcon name="interactivebrokers" size={20} />
 */

import Image from "next/image";

type BrandIconProps = {
  name: string;
  size?: number;
  className?: string;
  alt?: string;
};

export function BrandIcon({ name, size = 20, className, alt }: BrandIconProps) {
  return (
    <Image
      src={`/icons/brands/${name}.svg`}
      alt={alt ?? name}
      width={size}
      height={size}
      className={className}
      unoptimized
    />
  );
}
