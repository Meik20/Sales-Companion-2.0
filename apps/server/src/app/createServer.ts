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

  app.use(helmet())
  app.use(cors({ origin: process.env.WEB_ORIGIN, credentials: true }))
  app.use(express.json())

  // Rate limiting to protect the API
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Trop de requêtes, veuillez réessayer plus tard.' }
  })
  app.use(limiter)

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // Basic route to avoid 404 on browser visit
  app.get('/', (_req, res) => {
    res.send('Sales Companion Backend API is running')
  })

  // Ignore favicon requests
  app.get('/favicon.ico', (_req, res) => res.status(204).end())

  app.use(authRoutes)
  app.use(adminRoutes)
  app.use(companiesRoutes)
  app.use(importsRoutes)
  app.use(pipelineRoutes)
  app.use(teamRoutes)
  app.use(assignmentsRoutes)
  app.use(aiRoutes)
  app.use(supportRoutes)

  app.use(errorMiddleware)

  return app
}