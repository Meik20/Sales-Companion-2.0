import type { Response, Request } from 'express'
import { z } from 'zod'
import type { AuthenticatedRequest } from '../../types/express'
import { teamService } from './team.service'

const createTeamAccessSchema = z.object({
  firstname: z.string().min(1),
  lastname: z.string().min(1),
  company: z.string().min(1),
  companyId: z.string().nullable().optional()
})

const activateMemberSchema = z.object({
  accessId: z.string().min(1),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6)
})

const revokeTeamAccessSchema = z.object({
  accessId: z.string().min(1)
})

export const teamController = {
  async createTeamAccess(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid || !req.auth.email) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const input = createTeamAccessSchema.parse(req.body)

    const result = await teamService.createTeamAccess({
      firstname: input.firstname,
      lastname: input.lastname,
      company: input.company,
      companyId: input.companyId ?? null,
      managerUid: req.auth.uid,
      managerEmail: req.auth.email,
      createdBy: req.auth.uid
    })

    return res.status(201).json(result)
  },

  async activateMember(req: AuthenticatedRequest, res: Response) {
    const input = activateMemberSchema.parse(req.body)
    const result = await teamService.activateMember(input)
    return res.status(201).json(result)
  },

  async getAccessInfo(req: Request, res: Response) {
    const { accessId } = req.params as { accessId: string }
    if (!accessId) {
      return res.status(400).json({ message: 'Access ID is required' })
    }
    try {
      const result = await teamService.getAccessInfo(accessId)
      return res.json(result)
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error')
      if (err.message.includes('not found')) {
        return res.status(404).json({ message: 'Access not found' })
      }
      throw error
    }
  },

  async listManagerAccesses(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const items = await teamService.listManagerAccesses(req.auth.uid)
    return res.json({ items })
  },

  async revokeTeamAccess(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const input = revokeTeamAccessSchema.parse(req.body)
    const result = await teamService.revokeTeamAccess({
      accessId: input.accessId,
      managerUid: req.auth.uid
    })

    return res.json(result)
  },

  async getManagerMemberDetail(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const result = await teamService.getManagerMemberDetail(
      req.auth.uid,
      req.params.accessId as string
    )
    return res.json(result)
  },

  async getManagerMembers(req: AuthenticatedRequest, res: Response) {
    if (!req.auth?.uid) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    const members = await teamService.getManagerMembers(req.auth.uid)
    return res.json(members)
  }
}
