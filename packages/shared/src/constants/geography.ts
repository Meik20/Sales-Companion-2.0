/**
 * Structure géographique (régions + villes) par pays.
 * Utilisé pour rendre les filtres de recherche dynamiques selon le pays de l'utilisateur.
 */
export const GEOGRAPHY: Record<
  string,
  { regions: string[]; citiesByRegion: Record<string, string[]> }
> = {
  // ── 🇨🇲 Cameroun ─────────────────────────────────────────────────────────────
  CM: {
    regions: [
      'Adamaoua',
      'Centre',
      'Est',
      'Extrême-Nord',
      'Littoral',
      'Nord',
      'Nord-Ouest',
      'Ouest',
      'Sud',
      'Sud-Ouest'
    ],
    citiesByRegion: {
      Adamaoua: ['Ngaoundéré', 'Meiganga', 'Tibati', 'Ngaoundal', 'Banyo'],
      Centre: ['Yaoundé', 'Mbalmayo', 'Bafia', 'Eséka', 'Nanga-Eboko', 'Obala', 'Monatélé'],
      Est: ['Bertoua', 'Abong-Mbang', 'Batouri', 'Yokadouma', 'Dimako'],
      'Extrême-Nord': ['Maroua', 'Mokolo', 'Kousseri', 'Yagoua', 'Mora'],
      Littoral: ['Douala', 'Nkongsamba', 'Edéa', 'Loum', 'Mbanga'],
      Nord: ['Garoua', 'Guider', 'Pitoa', 'Lagdo', 'Ngong'],
      'Nord-Ouest': ['Bamenda', 'Kumbo', 'Wum', 'Mbengwi', 'Fundong'],
      Ouest: ['Bafoussam', 'Dschang', 'Mbouda', 'Foumban', 'Bangangté'],
      Sud: ['Ebolowa', 'Sangmélima', 'Kribi', 'Ambam', 'Lolodorf'],
      'Sud-Ouest': ['Buea', 'Limbe', 'Kumba', 'Mamfe', 'Tiko']
    }
  },

  // ── 🇸🇳 Sénégal ───────────────────────────────────────────────────────────────
  SN: {
    regions: [
      'Dakar',
      'Thiès',
      'Saint-Louis',
      'Diourbel',
      'Fatick',
      'Kaolack',
      'Kolda',
      'Louga',
      'Matam',
      'Sédhiou',
      'Tambacounda',
      'Kaffrine',
      'Kédougou',
      'Ziguinchor'
    ],
    citiesByRegion: {
      Dakar: ['Dakar', 'Pikine', 'Guédiawaye', 'Rufisque', 'Bargny'],
      Thiès: ['Thiès', 'Mbour', 'Tivaouane', 'Joal-Fadiouth', 'Khombole'],
      'Saint-Louis': ['Saint-Louis', 'Richard-Toll', 'Dagana', 'Podor'],
      Diourbel: ['Diourbel', 'Mbacké', 'Bambey', 'Touba'],
      Fatick: ['Fatick', 'Foundiougne', 'Gossas'],
      Kaolack: ['Kaolack', 'Nioro du Rip', 'Guinguinéo'],
      Kolda: ['Kolda', 'Vélingara', 'Médina Yoro Foulah'],
      Louga: ['Louga', 'Kébémer', 'Linguère'],
      Matam: ['Matam', 'Kanel', 'Ranérou'],
      Sédhiou: ['Sédhiou', 'Bounkiling', 'Goudomp'],
      Tambacounda: ['Tambacounda', 'Bakel', 'Goudiry', 'Koumpentoum'],
      Kaffrine: ['Kaffrine', 'Birkelane', 'Koungheul', 'Malem-Hodar'],
      Kédougou: ['Kédougou', 'Saraya', 'Salemata'],
      Ziguinchor: ['Ziguinchor', 'Bignona', 'Oussouye']
    }
  },

  // ── 🇨🇮 Côte d'Ivoire ────────────────────────────────────────────────────────
  CI: {
    regions: [
      'Abidjan',
      'Bas-Sassandra',
      'Comoé',
      'Denguélé',
      'Gôh-Djiboua',
      'Lacs',
      'Lagunes',
      'Montagnes',
      'Sassandra-Marahoué',
      'Savanes',
      'Vallée du Bandama',
      'Woroba',
      'Yamoussoukro',
      'Zanzan'
    ],
    citiesByRegion: {
      Abidjan: ['Abidjan', 'Cocody', 'Plateau', 'Yopougon', 'Abobo', 'Marcory', 'Koumassi'],
      'Bas-Sassandra': ['San-Pédro', 'Sassandra', 'Soubré', 'Tabou'],
      Comoé: ['Aboisso', 'Adiaké', 'Grand-Bassam'],
      Denguélé: ['Odienné', 'Minignan'],
      'Gôh-Djiboua': ['Divo', 'Fresco', 'Lakota'],
      Lacs: ['Dimbokro', 'Bongouanou', 'Toumodi'],
      Lagunes: ['Dabou', 'Abidjan-Lagunes', 'Jacqueville'],
      Montagnes: ['Man', 'Danané', 'Biankouma', 'Toulepleu'],
      'Sassandra-Marahoué': ['Daloa', 'Issia', 'Bouaflé'],
      Savanes: ['Korhogo', 'Boundiali', 'Ferkessédougou', 'Tengréla'],
      'Vallée du Bandama': ['Bouaké', 'Béoumi', 'Katiola', 'Sakassou'],
      Woroba: ['Séguéla', 'Touba', 'Mankono'],
      Yamoussoukro: ['Yamoussoukro'],
      Zanzan: ['Abengourou', 'Bondoukou', 'Tanda']
    }
  },

  // ── 🇧🇯 Bénin ─────────────────────────────────────────────────────────────────
  BJ: {
    regions: [
      'Alibori',
      'Atakora',
      'Atlantique',
      'Borgou',
      'Collines',
      'Couffo',
      'Donga',
      'Littoral',
      'Mono',
      'Ouémé',
      'Plateau',
      'Zou'
    ],
    citiesByRegion: {
      Alibori: ['Kandi', 'Banikoara', 'Gogounou', 'Malanville'],
      Atakora: ['Natitingou', 'Tanguiéta', 'Toucountouna'],
      Atlantique: ['Allada', 'Ouidah', 'Abomey-Calavi', 'Kpomassè'],
      Borgou: ['Parakou', 'Bembèrèkè', 'Nikki', 'Tchaourou'],
      Collines: ['Dassa-Zoumé', 'Bantè', 'Ouèssè', 'Savalou'],
      Couffo: ['Aplahoué', 'Djakotomey', 'Lalo'],
      Donga: ['Djougou', 'Bassila', 'Copargo'],
      Littoral: ['Cotonou'],
      Mono: ['Lokossa', 'Comè', 'Grand-Popo'],
      Ouémé: ['Porto-Novo', 'Adjara', 'Akpro-Missérété', 'Avrankou'],
      Plateau: ['Pobè', 'Ifangni', 'Kétou'],
      Zou: ['Abomey', 'Bohicon', 'Covè', 'Zagnanado']
    }
  },

  // ── 🇹🇬 Togo ──────────────────────────────────────────────────────────────────
  TG: {
    regions: ['Maritime', 'Plateaux', 'Centrale', 'Kara', 'Savanes'],
    citiesByRegion: {
      Maritime: ['Lomé', 'Aného', 'Tabligbo', 'Tsévié', 'Vogan'],
      Plateaux: ['Atakpamé', 'Kpalimé', 'Badou', 'Notsé', 'Sokodé'],
      Centrale: ['Sokodé', 'Sotouboua', 'Tchamba'],
      Kara: ['Kara', 'Bassar', 'Niamtougou', 'Pagouda'],
      Savanes: ['Dapaong', 'Mango', 'Tone']
    }
  },

  // ── 🇹🇩 Tchad ─────────────────────────────────────────────────────────────────
  TD: {
    regions: [
      'N\'Djaména',
      'Logone Occidental',
      'Logone Oriental',
      'Mandoul',
      'Moyen-Chari',
      'Tandjilé',
      'Chari-Baguirmi',
      'Hadjer-Lamis',
      'Batha',
      'Guéra',
      'Salamat',
      'Mayo-Kebbi Est',
      'Mayo-Kebbi Ouest',
      'Borkou',
      'Ennedi',
      'Tibesti',
      'Wadi Fira',
      'Lac'
    ],
    citiesByRegion: {
      "N'Djaména": ["N'Djaména"],
      'Logone Occidental': ['Moundou', 'Doba', 'Beinamar'],
      'Logone Oriental': ['Doba', 'Baibokoum', 'Béboto'],
      Mandoul: ['Koumra', 'Moïssala'],
      'Moyen-Chari': ['Sarh', 'Kyabé'],
      Tandjilé: ['Laï', 'Kélo'],
      'Chari-Baguirmi': ["N'Djaména", 'Massenya', 'Bousso'],
      'Hadjer-Lamis': ['Massakory', 'Ngouri'],
      Batha: ['Ati', 'Oum Hadjer'],
      Guéra: ['Mongo', 'Bitkine'],
      Salamat: ['Am Timan', 'Haraze Mangueigne'],
      'Mayo-Kebbi Est': ['Bongor', 'Guelendeng'],
      'Mayo-Kebbi Ouest': ['Pala', 'Léré'],
      Borkou: ['Faya-Largeau'],
      Ennedi: ['Fada', 'Biltine'],
      Tibesti: ['Bardaï'],
      'Wadi Fira': ['Abéché', 'Biltine'],
      Lac: ['Bol']
    }
  },

  // ── 🇨🇫 République Centrafricaine ─────────────────────────────────────────────
  CF: {
    regions: [
      'Bangui',
      'Ombella-M\'Poko',
      'Lobaye',
      'Sangha-Mbaéré',
      'Mambéré-Kadéï',
      'Nana-Mambéré',
      'Ouham',
      'Ouham-Pendé',
      'Nana-Grébizi',
      'Kémo',
      'Ouaka',
      'Basse-Kotto',
      'Mbomou',
      'Haute-Kotto',
      'Haut-Mbomou',
      'Vakaga'
    ],
    citiesByRegion: {
      Bangui: ['Bangui'],
      "Ombella-M'Poko": ['Bimbo', 'Damara', 'Boali'],
      Lobaye: ['Mbaïki', 'Mongoumba'],
      'Sangha-Mbaéré': ['Nola', 'Bayanga'],
      'Mambéré-Kadéï': ['Berbérati', 'Gamboula', 'Carnot'],
      'Nana-Mambéré': ['Bouar', 'Baboua'],
      Ouham: ['Bossangoa', 'Batangafo', 'Bouca'],
      'Ouham-Pendé': ['Bozoum', 'Paoua', 'Bossembélé'],
      'Nana-Grébizi': ['Kaga-Bandoro', 'Mbrès'],
      Kémo: ['Sibut', 'Dékoa'],
      Ouaka: ['Bambari', 'Grimari', 'Ippy'],
      'Basse-Kotto': ['Mobaye', 'Alindao', 'Kembé'],
      Mbomou: ['Bangassou', 'Gambo', 'Rafaï'],
      'Haute-Kotto': ['Bria', 'Yalinga', 'Birao'],
      'Haut-Mbomou': ['Obo', 'Djéma'],
      Vakaga: ['Birao', 'Gordil']
    }
  }
}

/** Retourne la géographie d'un pays, avec fallback sur le Cameroun */
export function getGeography(countryCode: string) {
  return GEOGRAPHY[countryCode] ?? GEOGRAPHY['CM']
}
