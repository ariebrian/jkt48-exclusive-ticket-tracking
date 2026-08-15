const PHOTO_BASE = 'https://jkt48.com/api/v1/storages/media/jkt48-member';

export function getMemberPhotoUrl(memberName: string): string {
  const slug = memberName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  return `${PHOTO_BASE}/${slug}.jpg`;
}
