import dayjs from 'dayjs'
import { ImmigrationDetention } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'

export default class ImmigrationDetentionService {
  public getImmigrationDetentionMessage(latestRecord: ImmigrationDetention) {
    let message: string
    if (latestRecord) {
      const formattedRecordDate = dayjs(latestRecord.recordDate).format('D MMMM YYYY')
      const recordedStr = `dated ${formattedRecordDate}`

      if (latestRecord.immigrationDetentionRecordType === 'IS91') {
        message = `IS91 Detention Authority ${recordedStr}`
      } else if (latestRecord.immigrationDetentionRecordType === 'DEPORTATION_ORDER') {
        message = `Deportation order ${recordedStr}`
      } else if (latestRecord.immigrationDetentionRecordType === 'IMMIGRATION_BAIL') {
        message = `Immigration bail ${recordedStr}`
      } else {
        message = `No longer of interest to Home Office ${recordedStr}`
      }
    } else {
      message = `There are no immigration documents recorded.`
    }
    return message
  }
}
