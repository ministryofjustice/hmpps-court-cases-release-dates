import { Request, Response } from 'express'

const maintenanceMiddleware = (req: Request, res: Response) => {
  return res.status(503).render('maintenance')
}

export default maintenanceMiddleware
