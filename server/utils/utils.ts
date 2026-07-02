import dayjs from 'dayjs'
import { Offence } from '../model/CourtCaseDetailsModel'
import { Charge, SentenceConsecutiveToDetails } from '../@types/remandAndSentencingApi/remandAndSentencingTypes'
import config from '../config'

const properCase = (word: string): string =>
  word.length >= 1 ? word[0].toUpperCase() + word.toLowerCase().slice(1) : word

const isBlank = (str: string): boolean => !str || /^\s*$/.test(str)

/**
 * Converts a name (first name, last name, middle name, etc.) to proper case equivalent, handling double-barreled names
 * correctly (i.e. each part in a double-barreled is converted to proper case).
 * @param name name to be converted.
 * @returns name converted to proper case.
 */
const properCaseName = (name: string): string => (isBlank(name) ? '' : name.split('-').map(properCase).join('-'))

export const convertToTitleCase = (sentence: string): string =>
  isBlank(sentence) ? '' : sentence.split(' ').map(properCaseName).join(' ')

export const initialiseName = (fullName?: string): string | null => {
  // this check is for the authError page
  if (!fullName) return null

  const array = fullName.split(' ')
  return `${array[0][0]}. ${array.reverse()[0]}`
}

export const getAsStringOrDefault = (value: unknown, defaultValue: string): string | null => {
  if (typeof value === 'string') return value
  return defaultValue
}

export const minOf = (a: number, b: number): number => {
  if (a > b) return b
  return a
}

export function orderOffences(offences: Offence[]): Offence[] {
  if (!offences) return offences
  return [...offences].sort((a, b) => {
    const groupA = groupOffence(a)
    const groupB = groupOffence(b)
    if (groupA !== groupB) return groupA - groupB

    if (groupA === OffenceGroup.NOMIS) return nomisLineNumberFromOffence(a) - nomisLineNumberFromOffence(b)

    if (groupA === OffenceGroup.RAS) {
      const subGroupA = rasSubRankForOffence(a)
      const subGroupB = rasSubRankForOffence(b)
      if (subGroupA !== subGroupB) return subGroupA - subGroupB
      if (subGroupA !== RasGroup.RAS_WITH_MINUS_ONE_COUNT) return rasCountForOffence(a) - rasCountForOffence(b)
    }
    const createChargeOrderDifference = offenceCreateChargeOrder(a) - offenceCreateChargeOrder(b)
    if (createChargeOrderDifference === 0) {
      const dateDifference = offenceDate(b) - offenceDate(a)
      if (dateDifference === 0) {
        return getOffenceCode(a).localeCompare(getOffenceCode(b))
      }
      return dateDifference
    }
    return createChargeOrderDifference
  })
}

const rasSubRankForOffence = (o: Offence) => (isOffenceRasMinusOne(o) ? 0 : 1)

const getOffenceCode = (o: Offence) => o.offenceCode

const groupOffence = (o: Offence) => {
  if (isNomisOffence(o)) return 0
  if (isOffenceRasMinusOne(o) || isRasWithCountOffence(o)) return 1
  return 2
}

const nomisLineNumberFromOffence = (o: Offence) => {
  const n = Number(o.sentence?.legacyData?.nomisLineReference)
  return Number.isFinite(n) ? n : Number.POSITIVE_INFINITY
}

const offenceDate = (o: Offence) => dateToTime(o.offenceEndDate ?? o.offenceStartDate)
const isNomisOffence = (o: Offence) => !!o.sentence && (getOffenceCount(o) == null || getOffenceCount(o) === '')
const isOffenceRasMinusOne = (o: Offence) => !!o.sentence && getOffenceCount(o) === '-1'
const getChargeCount = (c: Charge) => c.sentence?.chargeNumber
const getOffenceCount = (o: Offence) => o.sentence?.countNumber
const offenceCreateChargeOrder = (o: Offence) => o.createChargeOrder ?? 0
const isRasWithCountOffence = (o: Offence) => {
  if (!o.sentence) return false
  const n = Number(getOffenceCount(o))
  return Number.isFinite(n) && n >= 0
}

export const formatDate = (date?: string | Date): string | null => {
  if (!date) return null

  return dayjs(date).format(config.dateFormat)
}

const dateToTime = (d?: Date | string) => {
  if (!d) return 0
  const date = typeof d === 'string' ? new Date(d) : d

  return date.getTime()
}

export const sortByDateDesc = (a: string | undefined | Date, b: string | undefined | Date) => {
  if (a && b) {
    return dayjs(a).isBefore(b) ? 1 : -1
  }
  return -1
}

const rasCountForOffence = (o: Offence) => {
  const n = Number(getOffenceCount(o))
  return Number.isFinite(n) && n >= 0 ? n : Number.POSITIVE_INFINITY
}

enum OffenceGroup {
  NOMIS = 0,
  RAS = 1,
  NO_SENTENCE = 2,
}

enum RasGroup {
  RAS_WITH_MINUS_ONE_COUNT = 0,
  RAS_WITH_COUNT = 1,
}

export const outcomeValueOrLegacy = (outcomeValue: string, legacyData: Record<string, never>) => {
  if (outcomeValue) {
    return outcomeValue
  }
  if (legacyData?.outcomeDescription) {
    return legacyData.outcomeDescription
  }
  return 'Not entered'
}

// TODO DM replace with Hassan's changes when ready
export const getAggravatingFactors = (offence: Offence) => {
  // If offence is null or undefined, return an empty list immediately
  if (!offence) {
    return []
  }

  const factors: string[] = []
  if (offence.terrorRelated) {
    factors.push('Offences aggravated by a terrorist connection')
  }
  if (offence.foreignPowerRelated) {
    factors.push('Offences aggravated by foreign power condition being met')
  }
  return factors
}

export const sentenceTypeValueOrLegacy = (sentenceTypeValue: string, legacyData: Record<string, never>) => {
  if (sentenceTypeValue) {
    return sentenceTypeValue
  }
  if (legacyData?.sentenceTypeDesc) {
    return legacyData.sentenceTypeDesc
  }
  return null
}

export function consecutiveToSentenceDetailsToOffenceDescriptions(
  consecutiveToSentenceDetails: SentenceConsecutiveToDetails[],
): [string, string][] {
  return Array.from(
    new Set(
      consecutiveToSentenceDetails
        .filter(sentence => sentence.chargeLegacyData?.offenceDescription)
        .map(sentence => [sentence.offenceCode, sentence.chargeLegacyData.offenceDescription]),
    ),
  )
}
