export function isDark(hex: string) {
  const n = parseInt((hex || "#000000").slice(1, 7), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return (r * 299 + g * 587 + b * 114) / 1000 < 150;
}
/** Readable text colour on top of `hex`. */
export const onColor = (hex: string) => (isDark(hex) ? "#FFFFFF" : "#17120E");
