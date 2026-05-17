import type { Request, Response } from 'express'
import { z } from 'zod'
import { authService } from './auth.service'

const adminLoginSchema = z.object({
  idToken: z.string().min(1)
})

export const authController = {
  async adminLogin(req: Request, res: Response) {
    const input = adminLoginSchema.parse(req.body)
    const result = await authService.login(input.idToken)
    return res.json(result)
  }
}
