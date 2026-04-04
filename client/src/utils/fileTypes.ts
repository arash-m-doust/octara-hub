const OFFICE_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.ms-excel',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'application/vnd.ms-word.document.macroEnabled.12',
  'application/vnd.ms-powerpoint.presentation.macroEnabled.12',
])

export function isOfficeMimeType(mimeType: string): boolean {
  return OFFICE_MIME_TYPES.has(mimeType)
}

export function isPdfMimeType(mimeType: string): boolean {
  return mimeType.includes('pdf')
}

export function isPreviewableDocumentMimeType(mimeType: string): boolean {
  return isOfficeMimeType(mimeType) || isPdfMimeType(mimeType)
}
