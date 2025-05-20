import crypto from 'crypto'
import express, { Router, Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import config from '../config'

export default function setUpWebSecurity(): Router {
  const router = express.Router()

  // Secure code best practice - see:
  // 1. https://expressjs.com/en/advanced/best-practice-security.html,
  // 2. https://www.npmjs.com/package/helmet
  router.use((_req: Request, res: Response, next: NextFunction) => {
    res.locals.cspNonce = crypto.randomBytes(16).toString('hex')
    next()
  })

  const scriptSrc = ["'self'", (_req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`]
  const styleSrc = ["'self'", (_req: Request, res: Response) => `'nonce-${res.locals.cspNonce}'`]
  const fontSrc = ["'self'"]
  const imgSrc = ["'self'", 'data:']
  const formAction = [
    `'self' ${config.apis.hmppsAuth.externalUrl} ${config.applications.digitalPrisonServices.url} https://www.smartsurvey.co.uk/`,
  ]
  const connectSrc = ["'self' https://northeurope-0.in.applicationinsights.azure.com"]

  if (config.apis.frontendComponents.enabled) {
    scriptSrc.push(config.apis.frontendComponents.url)
    styleSrc.push(config.apis.frontendComponents.url)
    imgSrc.push(config.apis.frontendComponents.url)
    fontSrc.push(config.apis.frontendComponents.url)
  }

  router.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc,
          styleSrc,
          fontSrc,
          imgSrc,
          formAction,
          connectSrc,
        },
      },
      crossOriginEmbedderPolicy: true,
    }),
  )
  return router
}
