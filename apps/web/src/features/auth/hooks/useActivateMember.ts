'use client'

import { useMutation } from '@tanstack/react-query'

type ActivateInput = {
  accessId: string
  email: string
  password: string
}

export function useActivateMember() {
  return useMutation({
    mutationFn: async (input: ActivateInput) => {
      const response = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData?.message || 'Erreur lors de l\'activation')
      }

      return response.json()
    },
  })
}
