export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
} as const;
export const IMAGE_ACCEPT = Object.keys(IMAGE_TYPES).join(',');

export function validateImageFile(file: { type: string; size: number }): string | null {
  if (!Object.hasOwn(IMAGE_TYPES, file.type)) {
    return 'Choose a JPEG, PNG, WebP, GIF, or AVIF image.';
  }
  if (file.size === 0) return 'This file is empty. Choose another image.';
  if (file.size > MAX_IMAGE_SIZE) return 'Choose an image smaller than 10 MB.';
  return null;
}

export function isAllowedImagePath(pathname: string, userId: string): boolean {
  const prefix = `recipe-images/${userId}/`;
  return pathname.startsWith(prefix) &&
    /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|png|webp|gif|avif)$/.test(pathname.slice(prefix.length));
}
