import { RequestHandler } from 'express'

export default class AccessibilityRoutes {
  constructor() {
    // intentionally left blank
  }

  public getAccessibilityStatement: RequestHandler = async (req, res) => {
    return res.render('pages/accessibility/index', {
      backlink: req.get('referer') || '/',
      errorMessage: null,
    })
  }
}
