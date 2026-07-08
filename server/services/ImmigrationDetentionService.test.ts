import ImmigrationDetentionService from './ImmigrationDetentionService'
import { ImmigrationDetention } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

describe('ImmigrationDetentionService', () => {
  const service = new ImmigrationDetentionService()

  const baseRecord: ImmigrationDetention = {
    immigrationDetentionUuid: 'imm-det-uuid',
    courtAppearanceUuid: 'ca-uuid',
    prisonerId: 'A12345B',
    immigrationDetentionRecordType: 'IS91',
    recordDate: '2022-06-22',
    createdAt: '2025-11-03T08:06:37.123Z',
    source: 'DPS',
  }

  describe('getImmigrationDetentionMessage', () => {
    it('should return the no-documents message when there is no record', () => {
      expect(service.getImmigrationDetentionMessage(undefined)).toBe('There are no immigration documents recorded.')
    })

    it('should return an IS91 message', () => {
      expect(service.getImmigrationDetentionMessage({ ...baseRecord, immigrationDetentionRecordType: 'IS91' })).toBe(
        'IS91 Detention Authority dated 22 June 2022',
      )
    })

    it('should return a deportation order message', () => {
      expect(
        service.getImmigrationDetentionMessage({
          ...baseRecord,
          immigrationDetentionRecordType: 'DEPORTATION_ORDER',
        }),
      ).toBe('Deportation order dated 22 June 2022')
    })

    it('should return an immigration bail message', () => {
      expect(
        service.getImmigrationDetentionMessage({
          ...baseRecord,
          immigrationDetentionRecordType: 'IMMIGRATION_BAIL',
        }),
      ).toBe('Immigration bail dated 22 June 2022')
    })

    it('should return a no-longer-of-interest message', () => {
      expect(
        service.getImmigrationDetentionMessage({
          ...baseRecord,
          immigrationDetentionRecordType: 'NO_LONGER_OF_INTEREST',
        }),
      ).toBe('No longer of interest to Home Office dated 22 June 2022')
    })

    it('should return a no longer of interest message as a fallback', () => {
      expect(service.getImmigrationDetentionMessage({ ...baseRecord, immigrationDetentionRecordType: 'UNKNOWN' })).toBe(
        'No longer of interest to Home Office dated 22 June 2022',
      )
    })

    it('should format the record date as "D MMMM YYYY"', () => {
      expect(service.getImmigrationDetentionMessage({ ...baseRecord, recordDate: '2024-01-05' })).toBe(
        'IS91 Detention Authority dated 5 January 2024',
      )
    })
  })
})
