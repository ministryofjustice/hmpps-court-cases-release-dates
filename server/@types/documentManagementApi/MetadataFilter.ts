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
  ADDRESSED_PRISON = "addressedPrison",
  COURT_CODE = "courtCode",
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
    return MetadataFilterMapper.getByFilter(filters, MetadataField.CASE_REFERENCES, MetadataFilterOperator.JSON_ARRAY_CONTAINS)
  }

  static getByAddressedPrison(filters: string[]): MetadataFilter | null {
    return MetadataFilterMapper.getByFilter(filters, MetadataField.ADDRESSED_PRISON, MetadataFilterOperator.IN)
  }

  static getByCourtCode(filters: string[]): MetadataFilter | null {
    return MetadataFilterMapper.getByFilter(filters, MetadataField.COURT_CODE, MetadataFilterOperator.IN)
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

  static getIsUnmatchedDocument(): MetadataFilter {
    return {
      field: MetadataField.PRISONER_NUMBER,
      operator: MetadataFilterOperator.NOT_EXISTS,
    } as MetadataFilter
  }

  static getByFilter(filterValues: string[], filterField: MetadataField, filterOperator: MetadataFilterOperator): MetadataFilter | null {
    if (filterValues.find(it => it === 'none'))
      return {
        field: filterField,
        operator: MetadataFilterOperator.NOT_EXISTS,
      } as MetadataFilter

    return (!filterValues.find(it => it === 'all')) ?
      {
        field: filterField,
        operator: filterOperator,
        values: filterValues,
      } as MetadataFilter :
      null
  }
}
