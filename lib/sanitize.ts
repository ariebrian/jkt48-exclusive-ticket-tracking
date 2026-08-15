import sanitizeHtmlLib from 'sanitize-html';

// content_body/short_description from the JKT48 API can contain HTML-ish or
// long text (see CLAUDE.md). Stored raw, sanitized only here at render time
// so the write path stays dumb and this can be tightened without a migration.
export function sanitizeHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  return sanitizeHtmlLib(raw, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a', 'span'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
