import dayjs from 'dayjs'
import periodLengthTypeHeadings from '../resources/PeriodLengthTypeHeadings'
import {
  PagedAppearancePeriodLength,
  PagedCharge,
  PagedSentence,
  PagedSentencePeriodLength,
} from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import { Offence, Sentence } from '../model/CourtCaseTypes'
import { SentenceLength } from '../@types/remandAndSentencingApi/model'

export const pagedAppearancePeriodLengthToSentenceLength = (
  pagedAppearancePeriodLength: PagedAppearancePeriodLength,
): SentenceLength => {
  if (pagedAppearancePeriodLength) {
    return {
      ...(typeof pagedAppearancePeriodLength.days === 'number'
        ? { days: String(pagedAppearancePeriodLength.days) }
        : {}),
      ...(typeof pagedAppearancePeriodLength.weeks === 'number'
        ? { weeks: String(pagedAppearancePeriodLength.weeks) }
        : {}),
      ...(typeof pagedAppearancePeriodLength.months === 'number'
        ? { months: String(pagedAppearancePeriodLength.months) }
        : {}),
      ...(typeof pagedAppearancePeriodLength.years === 'number'
        ? { years: String(pagedAppearancePeriodLength.years) }
        : {}),
      periodOrder: pagedAppearancePeriodLength.order.split(','),
      periodLengthType: pagedAppearancePeriodLength.type,
      description: periodLengthTypeHeadings[pagedAppearancePeriodLength.type],
    } as SentenceLength
  }
  return null
}

export const pagedChargeToOffence = (pagedCharge: PagedCharge, createChargeOrder: number): Offence => {
  return {
    offenceCode: pagedCharge.offenceCode,
    outcomeUuid: pagedCharge.outcome?.outcomeUuid,
    aggravatingFactors: pagedCharge.aggravatingFactors,
    createChargeOrder,
    ...(pagedCharge.offenceStartDate && { offenceStartDate: dayjs(pagedCharge.offenceStartDate).toDate() }),
    ...(pagedCharge.offenceEndDate && { offenceEndDate: dayjs(pagedCharge.offenceEndDate).toDate() }),
    ...(pagedCharge.legacyData && { legacyData: { ...pagedCharge.legacyData } }),
    ...(pagedCharge.sentence && { sentence: pagedSentenceToSentence(pagedCharge.sentence) }),
    ...(pagedCharge.mergedFromCase && { mergedFromCase: pagedCharge.mergedFromCase }),
  } as Offence
}

export const pagedSentenceToSentence = (pagedSentence: PagedSentence): Sentence => {
  return {
    sentenceUuid: pagedSentence.sentenceUuid,
    countNumber: pagedSentence.chargeNumber,
    periodLengths: pagedSentence.periodLengths.map(periodLength =>
      pagedSentencePeriodLengthToSentenceLength(periodLength),
    ),
    sentenceServeType: pagedSentence.sentenceServeType,
    sentenceTypeId: pagedSentence.sentenceType?.sentenceTypeUuid,
    sentenceTypeClassification: pagedSentence.sentenceType?.classification,
    consecutiveToSentenceUuid: pagedSentence.consecutiveToSentenceUuid ?? undefined,
    fineAmount: pagedSentence.fineAmount,
    ...(pagedSentence.convictionDate && { convictionDate: dayjs(pagedSentence.convictionDate).toDate() }),
    ...(pagedSentence.legacyData && { legacyData: { ...pagedSentence.legacyData } }),
  } as Sentence
}

export const pagedSentencePeriodLengthToSentenceLength = (
  pagedSentencePeriodLength: PagedSentencePeriodLength,
): SentenceLength => {
  if (pagedSentencePeriodLength) {
    return {
      ...(typeof pagedSentencePeriodLength.days === 'number' ? { days: String(pagedSentencePeriodLength.days) } : {}),
      ...(typeof pagedSentencePeriodLength.weeks === 'number'
        ? { weeks: String(pagedSentencePeriodLength.weeks) }
        : {}),
      ...(typeof pagedSentencePeriodLength.months === 'number'
        ? { months: String(pagedSentencePeriodLength.months) }
        : {}),
      ...(typeof pagedSentencePeriodLength.years === 'number'
        ? { years: String(pagedSentencePeriodLength.years) }
        : {}),
      periodOrder: pagedSentencePeriodLength.order.split(','),
      periodLengthType: pagedSentencePeriodLength.type,
      legacyData: pagedSentencePeriodLength.legacyData,
      description:
        periodLengthTypeHeadings[pagedSentencePeriodLength.type] ??
        pagedSentencePeriodLength.legacyData?.sentenceTermDescription,
      uuid: pagedSentencePeriodLength.periodLengthUuid,
    } as SentenceLength
  }
  return null
}
