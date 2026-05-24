/** Maps pixel `size` props to Tailwind classes so parent `[&_svg]:size-*` rules are skipped. */
const ICON_SIZE_CLASS_BY_PX: Record<number, string> = {
  12: "size-3",
  14: "size-3.5",
  16: "size-4",
  18: "size-4.5",
  20: "size-5",
  24: "size-6",
  28: "size-7",
  32: "size-8",
};

export function iconSizeClass(size: number): string {
  return ICON_SIZE_CLASS_BY_PX[size] ?? `size-[${size}px]`;
}
