import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import { errorMiddleware } from '../middlewares/error.middleware'
import { adminRoutes } from '../modules/admin/admin.routes'
import { aiRoutes } from '../modules/ai/ai.routes'
import { assignmentsRoutes } from '../modules/assignments/assignments.routes'
import { authRoutes } from '../modules/auth/auth.routes'
import { companiesRoutes } from '../modules/companies/companies.routes'
import { importsRoutes } from '../modules/imports/imports.routes'
import { pipelineRoutes } from '../modules/pipeline/pipeline.routes'
import { supportRoutes } from '../modules/support/support.routes'
import { teamRoutes } from '../modules/team/team.routes'

export function createServer() {
  const app = express()

  // Permet de lire la vraie IP client derrière Railway/proxy
  app.set('trust proxy', 1)

  app.use(helmet())
  app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }))
  app.use(express.json())

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de requêtes, veuillez réessayer plus tard.' },
    skip: (req) => {
      const origin = req.headers.origin || ''
      const internalHosts = ['railway.internal', 'localhost', '127.0.0.1']
      return internalHosts.some(
        (h) => origin.includes(h) || (req.hostname?.includes(h) ?? false)
      )
    }
  })
  app.use(limiter)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.get('/', (_req, res) => {
    res.send('Sales Companion Backend API is running')
  })

  app.get('/favicon.ico', (_req, res) => res.status(204).end())

  // Toutes les routes sous /api
  app.use('/api', authRoutes)
  app.use('/api', adminRoutes)
  app.use('/api', companiesRoutes)
  app.use('/api', importsRoutes)
  app.use('/api', pipelineRoutes)
  app.use('/api', teamRoutes)
  app.use('/api', assignmentsRoutes)
  app.use('/api', aiRoutes)
  app.use('/api', supportRoutes)

  app.use(errorMiddleware)

  return app
}