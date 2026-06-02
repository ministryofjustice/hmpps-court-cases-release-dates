const commonPlatformDocumentTypes = {
  SENTENCING_WARRANT: {
    name: 'Sentencing warrant',
  },
  REMAND_WARRANT: {
    name: 'Remand warrant',
  },
  COMMON_PLATFORM_DOCUMENT: {
    name: 'Common platform document',
  },
  PRISON_COURT_REGISTER: {
    name: 'Prison court register',
  },
} as Record<string, CommonPlatformDocumentType>

type CommonPlatformDocumentType = {
  name: string
}

export default commonPlatformDocumentTypes
