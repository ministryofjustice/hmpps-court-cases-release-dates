import { MetadataFilter } from './types'

export enum MetadataFilterOperator {
  EQUALS = "EQUALS",
  NOT_EQUALS = "NOT_EQUALS",
  IN = "IN",
  EXISTS = "EXISTS",
  NOT_EXISTS = "NOT_EXISTS",
  JSON_ARRAY_CONTAINS = "JSON_ARRAY_CONTAINS",
}

export enum MetadataField {
  IS_UNREAD = "isUnread",
  CASE_REFERENCES = "caseReferences",
  PRISONER_NUMBER = "prisonerId",
  STATUS = "status",
}

export class MetadataFilterMapper {

  static getShowing(filter: string): MetadataFilter | null {
    return (filter === 'new') ?
      {
        field: MetadataField.IS_UNREAD,
        operator: MetadataFilterOperator.EQUALS,
        values: ['true'],
      } as MetadataFilter :
      null
  }

  static getByCaseReferences(filters: string[]): MetadataFilter | null {
    if (filters.find(it => it === 'none'))
      return {
        field: MetadataField.CASE_REFERENCES,
        operator: MetadataFilterOperator.NOT_EXISTS,
      } as MetadataFilter

    return (!filters.find(it => it === 'all')) ?
      {
        field: MetadataField.CASE_REFERENCES,
        operator: MetadataFilterOperator.JSON_ARRAY_CONTAINS,
        values: filters,
      } as MetadataFilter :
      null
  }

  static getPrisonerNumber(prisonerNumber: string): MetadataFilter {
    return {
        field: MetadataField.PRISONER_NUMBER,
        operator: MetadataFilterOperator.EQUALS,
        values: [prisonerNumber],
      } as MetadataFilter
  }

  static getStatus(status: string): MetadataFilter {
    return {
        field: MetadataField.STATUS,
        operator: MetadataFilterOperator.EQUALS,
        values: [status],
      } as MetadataFilter
  }
}
