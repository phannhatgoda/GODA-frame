import { customAlphabet } from "nanoid";

const rand = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 5);

export function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const withSuffix = (base: string) => `${base || "frame"}-${rand()}`;
