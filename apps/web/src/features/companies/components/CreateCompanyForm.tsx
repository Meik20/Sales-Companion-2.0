'use client'

import { useState } from 'react'

export const CreateCompanyForm = () => {
  const [name, setName] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Company created:', name)
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nom de l'entreprise"
      />
      <button type="submit">Créer</button>
    </form>
  )
}
