import {
  searchCompanies,
  getCompanyDetails,
  getMarketOverview,
  type SearchCompaniesOptions
} from './company-search'

/**
 * Déclarations des outils pour Google Gemini API
 */
export const GEMINI_TOOLS = [
  {
    functionDeclarations: [
      {
        name: 'search_companies',
        description:
          "Recherche des entreprises camerounaises dans la base de données officielle (RCCM/NIU). Utilise cette fonction dès que l'utilisateur demande des entreprises, des cibles, des prospects, ou filtre par secteur, région ou ville.",
        parameters: {
          type: 'OBJECT',
          properties: {
            query: {
              type: 'STRING',
              description: "Nom de l'entreprise, mot-clé métier, ou sigle (ex: 'BTP', 'Camtel', 'Transport')"
            },
            sector: {
              type: 'STRING',
              description:
                "Secteur d'activité (ex: 'Commerce', 'BTP & Construction', 'Industrie manufacturière', 'Agriculture & Agroalimentaire', 'Services & Conseil', 'Transport & Logistique', 'Santé', 'Technologies & Numérique', 'Finance & Assurance')"
            },
            region: {
              type: 'STRING',
              description:
                "Région du Cameroun (ex: 'Littoral', 'Centre', 'Ouest', 'Nord-Ouest', 'Sud-Ouest', 'Adamaoua', 'Nord', 'Extrême-Nord', 'Est', 'Sud')"
            },
            city: {
              type: 'STRING',
              description: "Ville principale (ex: 'Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Bamenda', 'Kribi')"
            },
            limit: {
              type: 'INTEGER',
              description: 'Nombre maximal de résultats à retourner (défaut: 5, max: 10)'
            }
          }
        }
      },
      {
        name: 'get_company_details',
        description:
          "Récupère la fiche détaillée d'une entreprise camerounaise spécifique par son nom exact, son sigle, son NIU ou son numéro RCCM.",
        parameters: {
          type: 'OBJECT',
          properties: {
            identifier: {
              type: 'STRING',
              description: "Le nom, le sigle, le NIU ou l'ID de l'entreprise recherchée"
            }
          },
          required: ['identifier']
        }
      },
      {
        name: 'get_market_overview',
        description:
          "Fournit une vue d'ensemble statistique du marché des entreprises camerounaises enregistrées (nombre total, répartition par secteur et par ville).",
        parameters: {
          type: 'OBJECT',
          properties: {
            region: {
              type: 'STRING',
              description: 'Filtrer les statistiques pour une région donnée (optionnel)'
            },
            sector: {
              type: 'STRING',
              description: 'Filtrer les statistiques pour un secteur donné (optionnel)'
            }
          }
        }
      }
    ]
  }
]

/**
 * Déclarations des outils pour Groq (format OpenAI compatible)
 */
export const GROQ_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_companies',
      description:
        "Recherche des entreprises camerounaises dans la base de données officielle (RCCM/NIU). Utilise cette fonction dès que l'utilisateur demande des entreprises, des cibles, des prospects, ou filtre par secteur, région ou ville.",
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: "Nom de l'entreprise, mot-clé métier, ou sigle (ex: 'BTP', 'Camtel', 'Transport')"
          },
          sector: {
            type: 'string',
            description:
              "Secteur d'activité (ex: 'Commerce', 'BTP & Construction', 'Industrie manufacturière', 'Agriculture & Agroalimentaire', 'Services & Conseil', 'Transport & Logistique', 'Santé', 'Technologies & Numérique', 'Finance & Assurance')"
          },
          region: {
            type: 'string',
            description:
              "Région du Cameroun (ex: 'Littoral', 'Centre', 'Ouest', 'Nord-Ouest', 'Sud-Ouest', 'Adamaoua', 'Nord', 'Extrême-Nord', 'Est', 'Sud')"
          },
          city: {
            type: 'string',
            description: "Ville principale (ex: 'Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Bamenda', 'Kribi')"
          },
          limit: {
            type: 'number',
            description: 'Nombre maximal de résultats à retourner (défaut: 5, max: 10)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_company_details',
      description:
        "Récupère la fiche détaillée d'une entreprise camerounaise spécifique par son nom exact, son sigle, son NIU ou son numéro RCCM.",
      parameters: {
        type: 'object',
        properties: {
          identifier: {
            type: 'string',
            description: "Le nom, le sigle, le NIU ou l'ID de l'entreprise recherchée"
          }
        },
        required: ['identifier']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_market_overview',
      description:
        "Fournit une vue d'ensemble statistique du marché des entreprises camerounaises enregistrées (nombre total, répartition par secteur et par ville).",
      parameters: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            description: 'Filtrer les statistiques pour une région donnée (optionnel)'
          },
          sector: {
            type: 'string',
            description: 'Filtrer les statistiques pour un secteur donné (optionnel)'
          }
        }
      }
    }
  }
]

/**
 * Exécute un outil demandé par le LLM et renvoie le résultat JSON
 */
export async function executeAITool(
  name: string,
  args: Record<string, unknown>,
  country = 'CM'
): Promise<unknown> {
  switch (name) {
    case 'search_companies': {
      const options: SearchCompaniesOptions = {
        query: typeof args.query === 'string' ? args.query : undefined,
        sector: typeof args.sector === 'string' ? args.sector : undefined,
        region: typeof args.region === 'string' ? args.region : undefined,
        city: typeof args.city === 'string' ? args.city : undefined,
        limit: typeof args.limit === 'number' ? args.limit : 5,
        country
      }
      return await searchCompanies(options)
    }

    case 'get_company_details': {
      const identifier = typeof args.identifier === 'string' ? args.identifier : ''
      const details = await getCompanyDetails(identifier, country)
      if (!details) {
        return { found: false, message: `Aucune entreprise trouvée pour l'identifiant: "${identifier}"` }
      }
      return { found: true, company: details }
    }

    case 'get_market_overview': {
      const region = typeof args.region === 'string' ? args.region : undefined
      const sector = typeof args.sector === 'string' ? args.sector : undefined
      return await getMarketOverview({ region, sector, country })
    }

    default:
      return { error: `Outil inconnu: ${name}` }
  }
}
