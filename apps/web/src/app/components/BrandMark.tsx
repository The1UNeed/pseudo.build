import Image from "next/image";

type BrandMarkProps = {
  size?: number;
  className?: string;
};

export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <Image
      src="/branding/app-icon-128.png"
      alt=""
      width={size}
      height={size}
      className={className}
      priority
    />
  );
}
