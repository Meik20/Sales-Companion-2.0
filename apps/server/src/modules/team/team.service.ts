import { admin, adminAuth, adminDb } from '../../firebase/admin'
import { buildTeamAccessLabel } from '@sales-companion/shared'

type CreateTeamAccessInput = {
  firstname: string
  lastname: string
  company: string
  companyId?: string | null
  managerUid: string
  managerEmail: string
  createdBy: string
}

type ActivateMemberInput = {
  accessId: string
  email: string
  password: string
}

type AccessInfo = {
  accessId: string
  accessLabel: string
  firstname: string
  lastname: string
  company: string
  status: string
}

type RevokeTeamAccessInput = {
  accessId: string
  managerUid: string
}

export const teamService = {
  async createTeamAccess(input: CreateTeamAccessInput) {
    const existingSnapshot = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', input.managerUid)
      .get()

    const activeOrPendingCount = existingSnapshot.docs.filter((doc) => {
      const data = doc.data()
      return data.status === 'pending' || data.status === 'active'
    }).length

    if (activeOrPendingCount >= 10) {
      throw new Error('Manager active or pending member access limit reached')
    }

    const accessLabel = buildTeamAccessLabel(input.firstname, input.lastname, input.company)

    const duplicateSnapshot = await adminDb
      .collection('team_accesses')
      .where('accessLabel', '==', accessLabel)
      .limit(1)
      .get()

    if (!duplicateSnapshot.empty) {
      throw new Error('Access label already exists')
    }

    const accessRef = adminDb.collection('team_accesses').doc()

    await accessRef.set({
      accessId: accessRef.id,
      accessLabel,
      firstname: input.firstname,
      lastname: input.lastname,
      company: input.company,
      companyId: input.companyId ?? null,
      role: 'member',
      status: 'pending',
      activated: false,
      firebaseUid: null,
      email: null,
      createdBy: input.createdBy,
      managerUid: input.managerUid,
      managerEmail: input.managerEmail,
      mustChangePassword: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return {
      accessId: accessRef.id,
      accessLabel
    }
  },

  async getAccessInfo(accessId: string): Promise<AccessInfo> {
    const accessSnap = await adminDb.collection('team_accesses').doc(accessId).get()

    if (!accessSnap.exists) {
      throw new Error('Access not found')
    }

    const access = accessSnap.data()
    if (!access) {
      throw new Error('Access data not found')
    }

    return {
      accessId: access.accessId,
      accessLabel: access.accessLabel,
      firstname: access.firstname,
      lastname: access.lastname,
      company: access.company,
      status: access.status
    }
  },

  async activateMember(input: ActivateMemberInput) {
    const accessRef = adminDb.collection('team_accesses').doc(input.accessId)
    const accessSnap = await accessRef.get()

    if (!accessSnap.exists) {
      throw new Error('Access not found')
    }

    const accessDoc = accessSnap
    const access = accessDoc.data()

    if (!access || access.status !== 'pending') {
      throw new Error('Access is not activable')
    }

    const userRecord = await adminAuth.createUser({
      email: input.email,
      password: input.password,
      displayName: `${access.firstname} ${access.lastname}`.trim()
    })

    await adminDb.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: input.email,
      name: `${access.firstname} ${access.lastname}`.trim(),
      role: 'member',
      companyId: access.companyId ?? null,
      managerUid: access.managerUid,
      teamAccessId: access.accessId,
      plan: 'starter',
      dailyLimit: 100,
      dailyUsed: 0,
      active: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    await accessRef.update({
      status: 'active',
      activated: true,
      firebaseUid: userRecord.uid,
      email: input.email,
      mustChangePassword: false,
      activatedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    return {
      uid: userRecord.uid,
      accessId: access.accessId,
      accessLabel: access.accessLabel,
      status: 'active'
    }
  },

  async revokeTeamAccess(input: RevokeTeamAccessInput) {
    const accessRef = adminDb.collection('team_accesses').doc(input.accessId)
    const accessSnap = await accessRef.get()

    if (!accessSnap.exists) {
      throw new Error('Access not found')
    }

    const access = accessSnap.data()

    if (!access) {
      throw new Error('Access data not found')
    }

    if (access.managerUid !== input.managerUid) {
      throw new Error('Forbidden')
    }

    await accessRef.update({
      status: 'revoked',
      activated: false,
      revokedAt: admin.firestore.FieldValue.serverTimestamp()
    })

    if (access.firebaseUid) {
      await adminDb.collection('users').doc(access.firebaseUid).set(
        {
          active: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        },
        { merge: true }
      )

      await adminAuth.updateUser(access.firebaseUid, {
        disabled: true
      })
    }

    return {
      accessId: input.accessId,
      revoked: true
    }
  },

  async listManagerAccesses(managerUid: string) {
    const snapshot = await adminDb
      .collection('team_accesses')
      .where('managerUid', '==', managerUid)
      .get()

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data()
    }))
  },

  async getManagerMemberDetail(managerUid: string, accessId: string) {
    const accessSnap = await adminDb.collection('team_accesses').doc(accessId).get()

    if (!accessSnap.exists) {
      throw new Error('Member access not found')
    }

    const access = accessSnap.data()

    if (!access || access.managerUid !== managerUid) {
      throw new Error('Forbidden')
    }

    const assignmentsSnapshot = await adminDb
      .collection('assignments')
      .where('managerUid', '==', managerUid)
      .where('assigneeId', '==', accessId)
      .get()

    const pipelineSnapshot = access.firebaseUid
      ? await adminDb
          .collection('pipeline')
          .where('userId', '==', access.firebaseUid)
          .get()
      : null

    return {
      access: {
        id: accessSnap.id,
        ...access
      },
      assignments: assignmentsSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })),
      pipeline: pipelineSnapshot
        ? pipelineSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
          }))
        : []
    }
  }
}