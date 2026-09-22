export default function documentTypeText(documentType?: string): string {
  if (!documentType) return 'Document'

  return documentType
    .toLowerCase()
    .split('_')
    .join(' ')
    .replace(/^./, first => first.toUpperCase())
}
