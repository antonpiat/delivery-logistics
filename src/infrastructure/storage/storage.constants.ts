export const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;

export const ALLOWED_UPLOAD_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export type AllowedUploadMimeType = (typeof ALLOWED_UPLOAD_MIME_TYPES)[number];

export function buildShipmentStoragePath(
  companyId: string,
  shipmentId: string,
  fileName: string,
): string {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const uniquePrefix = Date.now().toString(36);
  return `${companyId}/shipments/${shipmentId}/${uniquePrefix}-${sanitized}`;
}
