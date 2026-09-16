import { Request, RequestHandler } from 'express'
import { auditService } from '@ministryofjustice/hmpps-audit-client'
import logger from '../../../logger'
import CourtDataIngestionService from '../../services/courtDataIngestionService'
import { ClassifyAddressRequest } from '../../@types/courtDataIngestionApi/deliveryAddressTypes'
import DeliveryAddressOverviewViewModel from '../../model/DeliveryAddressOverviewViewModel'
import { FormError, DeliveryNotification } from '../../model/deliveryAddress'

const asString = (value: unknown): string => (typeof value === 'string' ? value : '')

export default class DeliveryAddressRoutes {
  constructor(private readonly courtDataIngestionService: CourtDataIngestionService) {}

  public overview: RequestHandler = async (req, res) => {
    const { token } = res.locals.user
    const addresses = await this.courtDataIngestionService.getUnclassifiedAddresses(token)

    return res.render('pages/documentDelivery/index', {
      model: new DeliveryAddressOverviewViewModel(addresses, this.notificationFrom(req.query)),
    })
  }

  public categories: RequestHandler = async (req, res) => {
    const { token } = res.locals.user
    const categories = await this.courtDataIngestionService.getCategories(token)

    return res.render('pages/documentDelivery/categories', {
      categories,
      notification: this.notificationFrom(req.query),
    })
  }

  public newCategoryForm: RequestHandler = async (_req, res) =>
    res.render('pages/documentDelivery/newCategory', { errors: [], values: {} })

  public createCategory: RequestHandler = async (req, res) => {
    const { token } = res.locals.user

    const values = {
      code: asString(req.body.code)
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_]/g, '_'),
      name: asString(req.body.name).trim(),
      unmatchedNeedsReview: req.body.unmatchedNeedsReview === 'true',
    }

    const errors: FormError[] = []
    // Mirrors the constraints the API enforces, so the user sees a GOV.UK error summary rather
    // than a 400. The API remains the authority; this is not the only check.
    if (!values.code) {
      errors.push({ href: '#code', field: 'code', text: 'Enter a category code' })
    } else if (!/^[A-Z][A-Z0-9_]{1,31}$/.test(values.code)) {
      errors.push({
        href: '#code',
        field: 'code',
        text: 'Code must be 2 to 32 characters, using letters, numbers and underscores, and start with a letter',
      })
    }
    if (!values.name) {
      errors.push({ href: '#name', field: 'name', text: 'Enter a category name' })
    } else if (!/^[\p{L}\p{N} '()&/-]{1,128}$/u.test(values.name)) {
      errors.push({
        href: '#name',
        field: 'name',
        text: 'Name must be 128 characters or fewer, using letters, numbers, spaces and simple punctuation',
      })
    }
    if (errors.length) return res.render('pages/documentDelivery/newCategory', { errors, values })

    const { outcome } = await this.courtDataIngestionService.createCategory(
      { ...values, requiresPrisonCode: false },
      token,
    )

    if (outcome === 'duplicate-category') {
      return res.render('pages/documentDelivery/newCategory', {
        errors: [{ href: '#code', field: 'code', text: `A category with the code ${values.code} already exists` }],
        values,
      })
    }

    await this.audit(req, 'CREATE_DELIVERY_CATEGORY', 'DELIVERY_CATEGORY', values.code, values)

    return res.redirect(`/document-delivery/categories?outcome=created&code=${encodeURIComponent(values.code)}`)
  }

  public classifyForm: RequestHandler = async (req, res) => {
    const { token } = res.locals.user
    const emailAddress = asString(req.query.email)
    if (!emailAddress) return res.redirect('/document-delivery')

    const categories = await this.courtDataIngestionService.getCategories(token)

    return res.render('pages/documentDelivery/classify', { emailAddress, categories, errors: [], values: {} })
  }

  /**
   * Non prison categories apply here. A prison mapping falls through to the check
   * answers page, because it is the only action with a retrospective blast radius.
   */
  public classify: RequestHandler = async (req, res) => {
    const { token } = res.locals.user

    const emailAddress = asString(req.body.emailAddress)
    const categoryCode = asString(req.body.categoryCode)
    const prisonCode = asString(req.body.prisonCode).trim().toUpperCase()

    const categories = await this.courtDataIngestionService.getCategories(token)
    const category = categories.find(it => it.code === categoryCode)

    const errors: FormError[] = []
    if (!emailAddress) return res.redirect('/document-delivery')
    if (!category) {
      errors.push({ href: '#categoryCode', field: 'categoryCode', text: 'Select where this traffic belongs' })
    }
    if (category?.requiresPrisonCode && !prisonCode) {
      errors.push({ href: '#prisonCode', field: 'prisonCode', text: 'Enter the prison code this address belongs to' })
    }

    if (errors.length) {
      return res.render('pages/documentDelivery/classify', {
        emailAddress,
        categories,
        errors,
        values: { categoryCode, prisonCode },
      })
    }

    if (category.requiresPrisonCode) {
      return res.redirect(
        `/document-delivery/confirm?email=${encodeURIComponent(emailAddress)}` +
          `&category=${encodeURIComponent(categoryCode)}&prison=${encodeURIComponent(prisonCode)}`,
      )
    }

    return this.apply(req, res, { emailAddress, categoryCode }, token)
  }

  public confirmForm: RequestHandler = async (req, res) => {
    const { token } = res.locals.user

    const request: ClassifyAddressRequest = {
      emailAddress: asString(req.query.email),
      categoryCode: asString(req.query.category),
      prisonCode: asString(req.query.prison) || undefined,
    }
    if (!request.emailAddress || !request.categoryCode) return res.redirect('/document-delivery')

    const preview = await this.courtDataIngestionService.previewClassification(request, token)

    return res.render('pages/documentDelivery/confirm', { preview })
  }

  public confirm: RequestHandler = async (req, res) => {
    const { token } = res.locals.user

    return this.apply(
      req,
      res,
      {
        emailAddress: asString(req.body.emailAddress),
        categoryCode: asString(req.body.categoryCode),
        prisonCode: asString(req.body.prisonCode) || undefined,
      },
      token,
    )
  }

  private async apply(
    req: Request,
    res: Parameters<RequestHandler>[1],
    request: ClassifyAddressRequest,
    token: string,
  ) {
    const { outcome, result } = await this.courtDataIngestionService.classifyAddress(request, token)

    await this.audit(req, 'CLASSIFY_DELIVERY_ADDRESS', 'DELIVERY_ADDRESS', request.emailAddress, {
      ...request,
      outcome,
      documentsQueued: result?.documentsQueued,
    })

    return res.redirect(
      `/document-delivery?outcome=${outcome}&email=${encodeURIComponent(request.emailAddress)}` +
        `&documents=${result?.documentsQueued ?? 0}&backfill=${result?.backfillOutcome ?? 'not-triggered'}`,
    )
  }

  private async audit(
    req: Request,
    action: string,
    subjectType: string,
    subjectId: string,
    details: Record<string, unknown>,
  ): Promise<void> {
    try {
      await auditService.sendAuditMessage({
        action,
        who: req.user.username,
        subjectId,
        subjectType,
        service: 'hmpps-court-cases-release-dates',
        correlationId: req.id,
        details: JSON.stringify(details),
        logErrors: true,
      })
    } catch (error) {
      logger.error(`Error sending audit event [${error}]`)
    }
  }

  private notificationFrom(query: Record<string, unknown>): DeliveryNotification | undefined {
    const outcome = asString(query.outcome)
    if (!outcome) return undefined

    const email = asString(query.email)
    const documents = asString(query.documents) || '0'
    const backfill = asString(query.backfill)

    switch (outcome) {
      case 'classified':
        return {
          type: 'success',
          text:
            backfill === 'already-running'
              ? `${email} classified. Its ${documents} documents will be picked up by the re-resolution already running.`
              : `${email} classified. Re-resolution started for ${documents} documents.`,
        }
      case 'created':
        return { type: 'success', text: `Category ${asString(query.code)} created` }
      case 'unknown-category':
        return { type: 'important', text: 'That category no longer exists' }
      case 'unknown-prison':
        return { type: 'important', text: 'That prison code was not recognised' }
      default:
        return undefined
    }
  }
}
