export function mapAuthError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Une erreur inattendue est survenue.'
  }

  const message = error.message.toLowerCase()
  const code = (error as any).code?.toLowerCase() || ''

  const errorString = message + ' ' + code

  if (errorString.includes('auth/email-already-in-use')) {
    return 'Cet email est déjà utilisé par un autre compte.'
  }
  if (errorString.includes('auth/invalid-email')) {
    return "L'adresse email est invalide."
  }
  if (
    errorString.includes('auth/invalid-credential') ||
    errorString.includes('auth/wrong-password') ||
    errorString.includes('auth/user-not-found')
  ) {
    return 'Email ou mot de passe incorrect.'
  }
  if (errorString.includes('auth/weak-password')) {
    return 'Le mot de passe est trop faible. Veuillez utiliser au moins 6 caractères.'
  }
  if (errorString.includes('auth/too-many-requests')) {
    return 'Trop de tentatives échouées. Veuillez réessayer plus tard.'
  }
  if (errorString.includes('auth/network-request-failed')) {
    return 'Erreur réseau. Veuillez vérifier votre connexion internet.'
  }
  if (errorString.includes('auth/operation-not-allowed')) {
    return "Ce mode de connexion n'est pas activé."
  }

  // Fallback for generic firebase errors
  if (errorString.includes('firebase')) {
    return "Une erreur d'authentification est survenue. Veuillez réessayer."
  }

  return error.message
}
