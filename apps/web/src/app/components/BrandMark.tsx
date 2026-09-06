type BrandMarkProps = {
  size?: number;
  className?: string;
};

/** Pseudo Build mark: three stacked code lines with one highlighted block. */
export function BrandMark({ size = 28, className }: BrandMarkProps) {
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <rect width="32" height="32" rx="7" fill="#14120F" />
      <rect x="7" y="21" width="18" height="4" rx="1.2" fill="#F5F1E8" />
      <rect x="7" y="15" width="14" height="4" rx="1.2" fill="#F5F1E8" />
      <rect x="7" y="9" width="9" height="4" rx="1.2" fill="#F5F1E8" />
      <rect x="19" y="9" width="6" height="4" rx="1.2" fill="#E8590C" />
    </svg>
  );
}
