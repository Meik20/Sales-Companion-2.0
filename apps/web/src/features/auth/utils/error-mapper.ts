export function mapAuthError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Une erreur inattendue est survenue.'
  }

  const message = error.message.toLowerCase()
  const rawCode =
    'code' in error && typeof (error as { code: unknown }).code === 'string'
      ? (error as { code: string }).code
      : ''
  const code = rawCode.toLowerCase()

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
    return "Ce mode de connexion n'est pas activé. Activez Google dans la console Firebase."
  }
  if (errorString.includes('auth/popup-blocked')) {
    return 'La popup a été bloquée par votre navigateur. Redirection en cours…'
  }
  if (
    errorString.includes('auth/popup-closed-by-user') ||
    errorString.includes('auth/cancelled-popup-request')
  ) {
    return 'Connexion Google annulée.'
  }
  if (errorString.includes('auth/account-exists-with-different-credential')) {
    return 'Un compte existe déjà avec cet email. Connectez-vous via email/mot de passe.'
  }
  if (
    errorString.includes('resource_exhausted') ||
    errorString.includes('quota exceeded') ||
    errorString.includes('resource-exhausted')
  ) {
    return 'Service temporairement indisponible. Veuillez réessayer dans quelques instants.'
  }
  if (errorString.includes('auth/requires-recent-login')) {
    return 'Pour des raisons de sécurité, veuillez vous reconnecter avant de continuer.'
  }
  if (errorString.includes('auth/user-disabled')) {
    return 'Ce compte a été désactivé. Veuillez contacter le support.'
  }

  // Fallback : ne jamais exposer un message technique brut au client
  if (errorString.includes('firebase') || errorString.includes('google') || /^\d+ [A-Z_]+:/.test(error.message)) {
    return "Une erreur est survenue. Veuillez réessayer ou contacter le support si le problème persiste."
  }

  // Dernier recours : message court et non technique
  return "Une erreur inattendue est survenue. Veuillez réessayer."
}
