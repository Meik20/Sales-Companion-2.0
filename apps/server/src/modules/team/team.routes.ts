import { Router } from 'express'
import { asyncHandler } from '../../utils/async-handler'
import { teamController } from './team.controller'
import { authMiddleware } from '../../middlewares/auth.middleware'
import { managerMiddleware } from '../../middlewares/manager.middleware'

export const teamRoutes = Router()

teamRoutes.post(
  '/team/accesses',
  authMiddleware,
  managerMiddleware,
  asyncHandler(teamController.createTeamAccess)
)

teamRoutes.get(
  '/team/accesses',
  authMiddleware,
  managerMiddleware,
  asyncHandler(teamController.listManagerAccesses)
)

teamRoutes.post(
  '/team/accesses/revoke',
  authMiddleware,
  managerMiddleware,
  asyncHandler(teamController.revokeTeamAccess)
)

teamRoutes.get(
  '/team/accesses/:accessId',
  authMiddleware,
  managerMiddleware,
  asyncHandler(teamController.getManagerMemberDetail)
)

teamRoutes.get(
  '/team/members',
  authMiddleware,
  managerMiddleware,
  asyncHandler(teamController.getManagerMembers)
)

teamRoutes.get('/team/accesses/:accessId/public', asyncHandler(teamController.getAccessInfo))

teamRoutes.post('/team/activate-member', asyncHandler(teamController.activateMember))
