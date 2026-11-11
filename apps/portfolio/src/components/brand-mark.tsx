import Image from "next/image";

/** Decorative emblem; the adjacent wordmark supplies the accessible brand name. */
export default function BrandMark({ monochrome = false }: { monochrome?: boolean }) {
  return (
    <span className="terrain-logo" aria-hidden="true">
      <Image
        className="terrain-logo-day"
        src={`/brand/terrain-a-${monochrome ? "icon-mono" : "icon"}.svg`}
        alt=""
        width={52}
        height={40}
        unoptimized
      />
      <Image
        className="terrain-logo-night"
        src={"/brand/terrain-a-icon-light.svg"}
        alt=""
        width={52}
        height={40}
        unoptimized
      />
    </span>
  );
}
