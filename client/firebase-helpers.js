/**
 * Firebase Client Helper Functions
 * Fonctions utilitaires pour authentification et DB
 */

import { auth, db } from './firebase-config.js';

/**
 * Inscription utilisateur
 */
export async function signUp(email, password, displayName) {
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;

    // Mettre à jour le profil
    await user.updateProfile({
      displayName: displayName || email.split('@')[0],
    });

    // Créer document utilisateur dans Firestore
    await db.collection('users').doc(user.uid).set({
      uid: user.uid,
      email: user.email,
      name: user.displayName,
      plan: 'free',
      dailyLimit: 10,
      dailyUsed: 0,
      lastReset: new Date().toISOString(),
      active: true,
      createdAt: new Date().toISOString(),
    });

    return { uid: user.uid, email: user.email };
  } catch (error) {
    console.error('Sign-up error:', error);
    throw error;
  }
}

/**
 * Connexion utilisateur
 */
export async function signIn(email, password) {
  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);
    const token = await userCredential.user.getIdToken();
    return { uid: userCredential.user.uid, email: userCredential.user.email, token };
  } catch (error) {
    console.error('Sign-in error:', error);
    throw error;
  }
}

/**
 * Déconnexion
 */
export async function signOut() {
  try {
    await auth.signOut();
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}

/**
 * Réinitialiser mot de passe
 */
export async function resetPassword(email) {
  try {
    await auth.sendPasswordResetEmail(email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
}

/**
 * Récupérer utilisateur actuel
 */
export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Obtenir token d'authentification
 */
export async function getToken() {
  const user = await getCurrentUser();
  if (!user) return null;
  return await user.getIdToken();
}

// ── FIRESTORE OPERATIONS ────────────────────────────────

/**
 * Récupérer profil utilisateur
 */
export async function getUserProfile(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return null;
    return { uid: doc.id, ...doc.data() };
  } catch (error) {
    console.error('Get user profile error:', error);
    throw error;
  }
}

/**
 * Mettre à jour profil utilisateur
 */
export async function updateUserProfile(uid, data) {
  try {
    await db.collection('users').doc(uid).update({
      ...data,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update user profile error:', error);
    throw error;
  }
}

/**
 * Rechercher entreprises
 */
export async function searchCompanies(filters = {}) {
  try {
    let query = db.collection('companies').where('active', '==', true);

    if (filters.sector) {
      query = query.where('sector', '==', filters.sector);
    }
    if (filters.region) {
      query = query.where('region', '==', filters.region);
    }
    if (filters.city) {
      query = query.where('city', '==', filters.city);
    }

    const snapshot = await query.limit(filters.limit || 50).get();
    const companies = [];
    snapshot.forEach((doc) => companies.push({ id: doc.id, ...doc.data() }));
    return companies;
  } catch (error) {
    console.error('Search companies error:', error);
    throw error;
  }
}

/**
 * Ajouter prospect au pipeline
 */
export async function addPipelineProspect(uid, prospectData) {
  try {
    const prospectRef = await db
      .collection('users')
      .doc(uid)
      .collection('pipeline')
      .add({
        ...prospectData,
        status: prospectData.status || 'prospection',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

    return { id: prospectRef.id, ...prospectData };
  } catch (error) {
    console.error('Add pipeline prospect error:', error);
    throw error;
  }
}

/**
 * Récupérer pipeline utilisateur
 */
export async function getUserPipeline(uid) {
  try {
    const snapshot = await db
      .collection('users')
      .doc(uid)
      .collection('pipeline')
      .orderBy('updatedAt', 'desc')
      .get();

    const prospects = [];
    snapshot.forEach((doc) => prospects.push({ id: doc.id, ...doc.data() }));
    return prospects;
  } catch (error) {
    console.error('Get user pipeline error:', error);
    throw error;
  }
}

/**
 * Mettre à jour prospect
 */
export async function updatePipelineProspect(uid, prospectId, data) {
  try {
    await db
      .collection('users')
      .doc(uid)
      .collection('pipeline')
      .doc(prospectId)
      .update({
        ...data,
        updatedAt: new Date().toISOString(),
      });
  } catch (error) {
    console.error('Update pipeline prospect error:', error);
    throw error;
  }
}

/**
 * Supprimer prospect
 */
export async function deletePipelineProspect(uid, prospectId) {
  try {
    await db.collection('users').doc(uid).collection('pipeline').doc(prospectId).delete();
  } catch (error) {
    console.error('Delete pipeline prospect error:', error);
    throw error;
  }
}

/**
 * Sauvegarder recherche
 */
export async function saveSearch(uid, title, query, filters, results) {
  try {
    await db.collection('saved_searches').add({
      uid,
      title,
      query,
      filters,
      results,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Save search error:', error);
    throw error;
  }
}

/**
 * Récupérer recherches sauvegardées
 */
export async function getSavedSearches(uid) {
  try {
    const snapshot = await db.collection('saved_searches').where('uid', '==', uid).get();
    const searches = [];
    snapshot.forEach((doc) => searches.push({ id: doc.id, ...doc.data() }));
    return searches;
  } catch (error) {
    console.error('Get saved searches error:', error);
    throw error;
  }
}
