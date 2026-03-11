/**
 * Curated landmark dataset for Panay Island.
 * Covers Iloilo Province (focus), Aklan, Antique, and Capiz.
 * Used to supplement Mapbox geocoding with locally-prioritized results.
 */

export type LandmarkCategory =
  | "mall"
  | "university"
  | "government"
  | "transport"
  | "church"
  | "commercial"
  | "tourist"
  | "city"
  | "hospital"
  | "subdivision"
  | "barangay"
  | "school"
  | "road";

export interface Landmark {
  name: string;
  category: LandmarkCategory;
  lng: number;
  lat: number;
  aliases?: string[];
  /** Municipality / city parent for display context */
  context?: string;
}

export const PANAY_LANDMARKS: Landmark[] = [
  // ══════════════════════════════════════════════════════════════
  //  MALLS & SHOPPING CENTERS
  // ══════════════════════════════════════════════════════════════
  { name: "SM City Iloilo", category: "mall", lng: 122.5692, lat: 10.7132, aliases: ["sm iloilo", "sm city"], context: "Mandurriao, Iloilo City" },
  { name: "Festive Walk Mall", category: "mall", lng: 122.5534, lat: 10.7200, aliases: ["festive walk", "megaworld festive"], context: "Mandurriao, Iloilo City" },
  { name: "Robinsons Place Iloilo", category: "mall", lng: 122.5635, lat: 10.6972, aliases: ["robinsons iloilo", "robinsons place"], context: "City Proper, Iloilo City" },
  { name: "Robinsons Jaro", category: "mall", lng: 122.5715, lat: 10.7280, aliases: ["robinsons jaro"], context: "Jaro, Iloilo City" },
  { name: "Gaisano City Iloilo", category: "mall", lng: 122.5690, lat: 10.6930, aliases: ["gaisano"], context: "City Proper, Iloilo City" },
  { name: "Gaisano Capital Pavia", category: "mall", lng: 122.5460, lat: 10.7750, aliases: ["gaisano pavia", "gaisano capital"], context: "Pavia, Iloilo" },
  { name: "Iloilo Supermart", category: "mall", lng: 122.5650, lat: 10.6960, aliases: ["supermart"], context: "City Proper, Iloilo City" },
  { name: "GT Town Center", category: "mall", lng: 122.5520, lat: 10.7050, aliases: ["gt town", "gt mall"], context: "Mandurriao, Iloilo City" },

  // ══════════════════════════════════════════════════════════════
  //  BUSINESS & COMMERCIAL DISTRICTS
  // ══════════════════════════════════════════════════════════════
  { name: "Iloilo Business Park", category: "commercial", lng: 122.5538, lat: 10.7188, aliases: ["business park", "ibp"], context: "Mandurriao, Iloilo City" },
  { name: "Megaworld Boulevard", category: "commercial", lng: 122.5530, lat: 10.7195, aliases: ["megaworld blvd", "megaworld"], context: "Mandurriao, Iloilo City" },
  { name: "Smallville Complex", category: "commercial", lng: 122.5600, lat: 10.7168, aliases: ["smallville"], context: "Mandurriao, Iloilo City" },
  { name: "Atria Park District", category: "commercial", lng: 122.5598, lat: 10.7140, aliases: ["atria"], context: "Mandurriao, Iloilo City" },
  { name: "Diversion Road", category: "road", lng: 122.5550, lat: 10.7100, aliases: ["diversion", "benigno aquino ave"], context: "Mandurriao, Iloilo City" },
  { name: "Plazuela de Iloilo", category: "commercial", lng: 122.5450, lat: 10.7020, aliases: ["plazuela"], context: "Mandurriao, Iloilo City" },
  { name: "The Avenue Iloilo", category: "commercial", lng: 122.5595, lat: 10.7155, aliases: ["the avenue"], context: "Mandurriao, Iloilo City" },

  // ══════════════════════════════════════════════════════════════
  //  GOVERNMENT BUILDINGS
  // ══════════════════════════════════════════════════════════════
  { name: "Iloilo City Hall", category: "government", lng: 122.5668, lat: 10.6950, aliases: ["city hall"], context: "City Proper, Iloilo City" },
  { name: "Iloilo Provincial Capitol", category: "government", lng: 122.5624, lat: 10.6982, aliases: ["capitol", "provincial capitol"], context: "City Proper, Iloilo City" },
  { name: "Iloilo Convention Center", category: "government", lng: 122.5620, lat: 10.6975, aliases: ["convention center", "icc"], context: "City Proper, Iloilo City" },
  { name: "Bureau of Immigration Iloilo", category: "government", lng: 122.5655, lat: 10.6945, aliases: ["immigration", "bi iloilo"], context: "City Proper, Iloilo City" },
  { name: "Pavia Municipal Hall", category: "government", lng: 122.5440, lat: 10.7730, aliases: ["pavia town hall", "pavia municipal"], context: "Pavia, Iloilo" },
  { name: "Oton Municipal Hall", category: "government", lng: 122.4800, lat: 10.6930, aliases: ["oton town hall"], context: "Oton, Iloilo" },
  { name: "Santa Barbara Municipal Hall", category: "government", lng: 122.5310, lat: 10.8210, aliases: ["sta barbara town hall"], context: "Santa Barbara, Iloilo" },

  // ══════════════════════════════════════════════════════════════
  //  UNIVERSITIES & SCHOOLS
  // ══════════════════════════════════════════════════════════════
  { name: "Central Philippine University", category: "university", lng: 122.5710, lat: 10.7290, aliases: ["cpu", "central philippine"], context: "Jaro, Iloilo City" },
  { name: "West Visayas State University", category: "university", lng: 122.5596, lat: 10.7175, aliases: ["wvsu", "west visayas"], context: "La Paz, Iloilo City" },
  { name: "University of the Philippines Visayas", category: "university", lng: 122.2350, lat: 10.6440, aliases: ["up visayas", "upv", "up miagao"], context: "Miagao, Iloilo" },
  { name: "St. Paul University Iloilo", category: "university", lng: 122.5640, lat: 10.6970, aliases: ["st paul", "saint paul"], context: "City Proper, Iloilo City" },
  { name: "Iloilo Science and Technology University", category: "university", lng: 122.5680, lat: 10.7020, aliases: ["isat u", "isatu", "isat"], context: "La Paz, Iloilo City" },
  { name: "University of San Agustin", category: "university", lng: 122.5645, lat: 10.6960, aliases: ["usa", "san agustin university"], context: "City Proper, Iloilo City" },
  { name: "University of Iloilo", category: "university", lng: 122.5640, lat: 10.7000, aliases: ["ui", "phinma iloilo"], context: "City Proper, Iloilo City" },
  { name: "John B. Lacson Colleges Foundation", category: "university", lng: 122.5670, lat: 10.6965, aliases: ["jblcf", "lacson", "john b lacson"], context: "City Proper, Iloilo City" },
  { name: "STI West Negros University Iloilo", category: "school", lng: 122.5660, lat: 10.6950, aliases: ["sti iloilo"], context: "City Proper, Iloilo City" },
  { name: "Ateneo de Iloilo", category: "school", lng: 122.5600, lat: 10.6900, aliases: ["ateneo", "ateneo santa maria"], context: "City Proper, Iloilo City" },
  { name: "Assumption Iloilo", category: "school", lng: 122.5650, lat: 10.6945, aliases: ["assumption"], context: "City Proper, Iloilo City" },
  { name: "Colegio de San Jose Jaro", category: "school", lng: 122.5695, lat: 10.7260, aliases: ["colegio jaro", "san jose jaro"], context: "Jaro, Iloilo City" },
  { name: "WVSU Pototan Campus", category: "university", lng: 122.6340, lat: 10.9440, aliases: ["wvsu pototan"], context: "Pototan, Iloilo" },
  { name: "Aklan State University", category: "university", lng: 122.3620, lat: 11.7120, aliases: ["asu", "aklan state"], context: "Banga, Aklan" },
  { name: "Capiz State University", category: "university", lng: 122.7520, lat: 11.5870, aliases: ["capsu"], context: "Roxas City, Capiz" },

  // ══════════════════════════════════════════════════════════════
  //  CHURCHES & TOURIST LANDMARKS
  // ══════════════════════════════════════════════════════════════
  { name: "Jaro Cathedral", category: "church", lng: 122.5700, lat: 10.7265, aliases: ["jaro church", "national shrine", "jaro metropolitan cathedral"], context: "Jaro, Iloilo City" },
  { name: "Molo Church", category: "church", lng: 122.5500, lat: 10.6950, aliases: ["molo church", "st anne church", "st. anne"], context: "Molo, Iloilo City" },
  { name: "Villa Arevalo Church", category: "church", lng: 122.5350, lat: 10.6850, aliases: ["arevalo church", "sto nino arevalo"], context: "Arevalo, Iloilo City" },
  { name: "La Paz Plaza", category: "tourist", lng: 122.5695, lat: 10.7110, aliases: ["la paz", "la paz public market"], context: "La Paz, Iloilo City" },
  { name: "Molo Plaza", category: "tourist", lng: 122.5498, lat: 10.6948, aliases: ["molo plaza"], context: "Molo, Iloilo City" },
  { name: "Esplanade", category: "tourist", lng: 122.5680, lat: 10.6920, aliases: ["esplanade", "iloilo esplanade", "iloilo river esplanade"], context: "City Proper, Iloilo City" },
  { name: "Museo Iloilo", category: "tourist", lng: 122.5622, lat: 10.6985, aliases: ["museo", "iloilo museum"], context: "City Proper, Iloilo City" },
  { name: "Miagao Church", category: "church", lng: 122.2340, lat: 10.6450, aliases: ["miagao church", "sto tomas de villanueva"], context: "Miagao, Iloilo" },
  { name: "Tigbauan Church", category: "church", lng: 122.3760, lat: 10.6790, aliases: ["tigbauan church"], context: "Tigbauan, Iloilo" },
  { name: "Guimbal Church", category: "church", lng: 122.3210, lat: 10.6610, aliases: ["guimbal church"], context: "Guimbal, Iloilo" },

  // ══════════════════════════════════════════════════════════════
  //  TRANSPORT HUBS
  // ══════════════════════════════════════════════════════════════
  { name: "Iloilo International Airport", category: "transport", lng: 122.4934, lat: 10.7133, aliases: ["airport", "ilo airport", "santa barbara airport"], context: "Santa Barbara, Iloilo" },
  { name: "Iloilo Port Area", category: "transport", lng: 122.5690, lat: 10.6900, aliases: ["port", "iloilo port", "fort san pedro port"], context: "City Proper, Iloilo City" },
  { name: "Tagbak Terminal", category: "transport", lng: 122.5480, lat: 10.7070, aliases: ["tagbak", "jaro terminal", "tagbak bus terminal"], context: "Jaro, Iloilo City" },
  { name: "Mohon Terminal", category: "transport", lng: 122.5520, lat: 10.7380, aliases: ["mohon", "mohon jeepney terminal"], context: "Jaro, Iloilo City" },
  { name: "Ceres Bus Terminal Iloilo", category: "transport", lng: 122.5483, lat: 10.7068, aliases: ["ceres iloilo", "ceres terminal"], context: "Jaro, Iloilo City" },
  { name: "Molo Terminal", category: "transport", lng: 122.5490, lat: 10.6940, aliases: ["molo terminal", "molo jeepney"], context: "Molo, Iloilo City" },
  { name: "Super Ferry Terminal", category: "transport", lng: 122.5695, lat: 10.6895, aliases: ["super ferry", "fastcraft terminal"], context: "City Proper, Iloilo City" },

  // ══════════════════════════════════════════════════════════════
  //  HOSPITALS & MEDICAL
  // ══════════════════════════════════════════════════════════════
  { name: "Iloilo Doctors' Hospital", category: "hospital", lng: 122.5615, lat: 10.7010, aliases: ["doctors hospital", "idh"], context: "City Proper, Iloilo City" },
  { name: "The Medical City Iloilo", category: "hospital", lng: 122.5545, lat: 10.7192, aliases: ["medical city", "tmc iloilo"], context: "Mandurriao, Iloilo City" },
  { name: "Western Visayas Medical Center", category: "hospital", lng: 122.5560, lat: 10.7170, aliases: ["wvmc", "west visayas medical"], context: "Mandurriao, Iloilo City" },
  { name: "St. Paul's Hospital Iloilo", category: "hospital", lng: 122.5638, lat: 10.6968, aliases: ["st pauls hospital"], context: "City Proper, Iloilo City" },
  { name: "Iloilo Mission Hospital", category: "hospital", lng: 122.5700, lat: 10.7280, aliases: ["mission hospital", "cpu hospital", "imh"], context: "Jaro, Iloilo City" },
  { name: "Metro Iloilo Hospital", category: "hospital", lng: 122.5560, lat: 10.7150, aliases: ["metro hospital"], context: "Mandurriao, Iloilo City" },
  { name: "Qualimed Iloilo", category: "hospital", lng: 122.5535, lat: 10.7190, aliases: ["qualimed"], context: "Mandurriao, Iloilo City" },
  { name: "QualiMed Hospital Pavia", category: "hospital", lng: 122.5450, lat: 10.7700, aliases: ["qualimed pavia"], context: "Pavia, Iloilo" },
  { name: "Medicus Medical Center", category: "hospital", lng: 122.5600, lat: 10.7160, aliases: ["medicus"], context: "Mandurriao, Iloilo City" },
  { name: "Riverside Medical Center", category: "hospital", lng: 122.5680, lat: 10.6960, aliases: ["riverside hospital"], context: "City Proper, Iloilo City" },

  // ══════════════════════════════════════════════════════════════
  //  SUBDIVISIONS & RESIDENTIAL AREAS
  // ══════════════════════════════════════════════════════════════
  // — Iloilo City —
  { name: "Green Meadows Subdivision", category: "subdivision", lng: 122.5580, lat: 10.7250, aliases: ["green meadows"], context: "Jaro, Iloilo City" },
  { name: "Monticello Villas", category: "subdivision", lng: 122.5560, lat: 10.7230, aliases: ["monticello"], context: "Jaro, Iloilo City" },
  { name: "Parc Regency Residences", category: "subdivision", lng: 122.5540, lat: 10.7210, aliases: ["parc regency"], context: "Mandurriao, Iloilo City" },
  { name: "Savannah Subdivision", category: "subdivision", lng: 122.5550, lat: 10.7300, aliases: ["savannah"], context: "Jaro, Iloilo City" },
  { name: "Villa Arevalo Heights", category: "subdivision", lng: 122.5370, lat: 10.6870, aliases: ["arevalo heights"], context: "Arevalo, Iloilo City" },
  { name: "Gentry Manor", category: "subdivision", lng: 122.5610, lat: 10.7220, aliases: ["gentry"], context: "Mandurriao, Iloilo City" },
  { name: "Sta. Cruz Village", category: "subdivision", lng: 122.5590, lat: 10.7240, aliases: ["sta cruz village", "santa cruz village"], context: "Jaro, Iloilo City" },
  { name: "La Residencia Subdivision", category: "subdivision", lng: 122.5570, lat: 10.7260, aliases: ["la residencia"], context: "Jaro, Iloilo City" },
  { name: "Monte Rosa Subdivision", category: "subdivision", lng: 122.5640, lat: 10.7320, aliases: ["monte rosa"], context: "Jaro, Iloilo City" },
  { name: "Lourdes Village", category: "subdivision", lng: 122.5500, lat: 10.7050, aliases: ["lourdes"], context: "Mandurriao, Iloilo City" },
  { name: "Balantang Heights", category: "subdivision", lng: 122.5530, lat: 10.7060, aliases: ["balantang heights"], context: "Jaro, Iloilo City" },
  { name: "North Forbes Iloilo", category: "subdivision", lng: 122.5620, lat: 10.7200, aliases: ["north forbes"], context: "Mandurriao, Iloilo City" },
  { name: "Camella Iloilo", category: "subdivision", lng: 122.5460, lat: 10.7600, aliases: ["camella"], context: "Pavia, Iloilo" },
  // — Pavia —
  { name: "Lumina Iloilo", category: "subdivision", lng: 122.5410, lat: 10.7680, aliases: ["lumina", "lumina pavia"], context: "Pavia, Iloilo" },
  { name: "Deca Homes Pavia", category: "subdivision", lng: 122.5390, lat: 10.7720, aliases: ["deca homes", "deca pavia"], context: "Pavia, Iloilo" },
  { name: "Amaia Scapes Pavia", category: "subdivision", lng: 122.5420, lat: 10.7760, aliases: ["amaia scapes", "amaia pavia"], context: "Pavia, Iloilo" },
  { name: "Lessandra Pavia", category: "subdivision", lng: 122.5450, lat: 10.7740, aliases: ["lessandra"], context: "Pavia, Iloilo" },
  { name: "Aldea del Sol Pavia", category: "subdivision", lng: 122.5400, lat: 10.7800, aliases: ["aldea del sol"], context: "Pavia, Iloilo" },
  { name: "Bria Homes Pavia", category: "subdivision", lng: 122.5380, lat: 10.7710, aliases: ["bria pavia", "bria homes"], context: "Pavia, Iloilo" },
  // — Oton —
  { name: "Savannah Subdivision Oton", category: "subdivision", lng: 122.4780, lat: 10.6920, aliases: ["savannah oton"], context: "Oton, Iloilo" },
  // — Santa Barbara —
  { name: "Camella Savannah Iloilo", category: "subdivision", lng: 122.5280, lat: 10.8150, aliases: ["camella savannah"], context: "Santa Barbara, Iloilo" },

  // ══════════════════════════════════════════════════════════════
  //  BARANGAYS — ILOILO CITY
  // ══════════════════════════════════════════════════════════════
  // Jaro district
  { name: "Brgy. Balantang, Jaro", category: "barangay", lng: 122.5530, lat: 10.7070, aliases: ["balantang"], context: "Jaro, Iloilo City" },
  { name: "Brgy. Buhang, Jaro", category: "barangay", lng: 122.5700, lat: 10.7350, aliases: ["buhang jaro"], context: "Jaro, Iloilo City" },
  { name: "Brgy. Dungon A", category: "barangay", lng: 122.5580, lat: 10.7180, aliases: ["dungon a"], context: "Jaro, Iloilo City" },
  { name: "Brgy. Dungon B", category: "barangay", lng: 122.5570, lat: 10.7200, aliases: ["dungon b"], context: "Jaro, Iloilo City" },
  { name: "Brgy. Lopez Jaena, Jaro", category: "barangay", lng: 122.5690, lat: 10.7300, aliases: ["lopez jaena jaro"], context: "Jaro, Iloilo City" },
  { name: "Brgy. Tabuc Suba, Jaro", category: "barangay", lng: 122.5610, lat: 10.7310, aliases: ["tabuc suba jaro"], context: "Jaro, Iloilo City" },
  { name: "Brgy. Javellana, Jaro", category: "barangay", lng: 122.5740, lat: 10.7320, aliases: ["javellana jaro"], context: "Jaro, Iloilo City" },
  { name: "Brgy. Quintin Salas, Jaro", category: "barangay", lng: 122.5660, lat: 10.7240, aliases: ["quintin salas"], context: "Jaro, Iloilo City" },
  { name: "Brgy. Simon Ledesma, Jaro", category: "barangay", lng: 122.5620, lat: 10.7260, aliases: ["simon ledesma"], context: "Jaro, Iloilo City" },
  // Mandurriao district
  { name: "Brgy. Bolilao, Mandurriao", category: "barangay", lng: 122.5590, lat: 10.7130, aliases: ["bolilao"], context: "Mandurriao, Iloilo City" },
  { name: "Brgy. Calahunan, Mandurriao", category: "barangay", lng: 122.5510, lat: 10.7100, aliases: ["calahunan"], context: "Mandurriao, Iloilo City" },
  { name: "Brgy. Dungon C, Mandurriao", category: "barangay", lng: 122.5560, lat: 10.7160, aliases: ["dungon c"], context: "Mandurriao, Iloilo City" },
  { name: "Brgy. Q. Abeto, Mandurriao", category: "barangay", lng: 122.5520, lat: 10.7120, aliases: ["q abeto", "quintin abeto"], context: "Mandurriao, Iloilo City" },
  { name: "Brgy. Navais, Mandurriao", category: "barangay", lng: 122.5540, lat: 10.7140, aliases: ["navais"], context: "Mandurriao, Iloilo City" },
  { name: "Brgy. Oñate de Leon, Mandurriao", category: "barangay", lng: 122.5575, lat: 10.7190, aliases: ["onate de leon"], context: "Mandurriao, Iloilo City" },
  // La Paz district
  { name: "Brgy. Baldoza, La Paz", category: "barangay", lng: 122.5680, lat: 10.7100, aliases: ["baldoza"], context: "La Paz, Iloilo City" },
  { name: "Brgy. Ticud, La Paz", category: "barangay", lng: 122.5700, lat: 10.7080, aliases: ["ticud"], context: "La Paz, Iloilo City" },
  { name: "Brgy. Rizal Estanzuela, La Paz", category: "barangay", lng: 122.5660, lat: 10.7050, aliases: ["rizal estanzuela", "estanzuela"], context: "La Paz, Iloilo City" },
  { name: "Brgy. San Isidro, La Paz", category: "barangay", lng: 122.5720, lat: 10.7060, aliases: ["san isidro la paz"], context: "La Paz, Iloilo City" },
  // City Proper
  { name: "Brgy. Tanza, City Proper", category: "barangay", lng: 122.5630, lat: 10.6940, aliases: ["tanza"], context: "City Proper, Iloilo City" },
  { name: "Brgy. Mabini-Delgado, City Proper", category: "barangay", lng: 122.5650, lat: 10.6950, aliases: ["mabini delgado"], context: "City Proper, Iloilo City" },
  { name: "Brgy. Ortiz, City Proper", category: "barangay", lng: 122.5640, lat: 10.6920, aliases: ["ortiz"], context: "City Proper, Iloilo City" },
  // Molo district
  { name: "Brgy. East Timawa, Molo", category: "barangay", lng: 122.5510, lat: 10.6970, aliases: ["east timawa"], context: "Molo, Iloilo City" },
  { name: "Brgy. West Timawa, Molo", category: "barangay", lng: 122.5480, lat: 10.6960, aliases: ["west timawa"], context: "Molo, Iloilo City" },
  { name: "Brgy. San Pedro, Molo", category: "barangay", lng: 122.5490, lat: 10.6930, aliases: ["san pedro molo"], context: "Molo, Iloilo City" },
  // Arevalo district
  { name: "Brgy. Sto. Niño Norte, Arevalo", category: "barangay", lng: 122.5340, lat: 10.6860, aliases: ["sto nino norte arevalo", "santo nino norte"], context: "Arevalo, Iloilo City" },
  { name: "Brgy. Sto. Niño Sur, Arevalo", category: "barangay", lng: 122.5330, lat: 10.6840, aliases: ["sto nino sur arevalo", "santo nino sur"], context: "Arevalo, Iloilo City" },
  { name: "Brgy. Calaparan, Arevalo", category: "barangay", lng: 122.5360, lat: 10.6880, aliases: ["calaparan"], context: "Arevalo, Iloilo City" },

  // ══════════════════════════════════════════════════════════════
  //  BARANGAYS — PAVIA
  // ══════════════════════════════════════════════════════════════
  { name: "Brgy. Ungka I, Pavia", category: "barangay", lng: 122.5500, lat: 10.7400, aliases: ["ungka 1", "ungka i"], context: "Pavia, Iloilo" },
  { name: "Brgy. Ungka II, Pavia", category: "barangay", lng: 122.5490, lat: 10.7420, aliases: ["ungka 2", "ungka ii"], context: "Pavia, Iloilo" },
  { name: "Brgy. Anilao, Pavia", category: "barangay", lng: 122.5440, lat: 10.7680, aliases: ["anilao pavia"], context: "Pavia, Iloilo" },
  { name: "Brgy. Aganan, Pavia", category: "barangay", lng: 122.5460, lat: 10.7620, aliases: ["aganan"], context: "Pavia, Iloilo" },
  { name: "Brgy. Pandac, Pavia", category: "barangay", lng: 122.5430, lat: 10.7780, aliases: ["pandac"], context: "Pavia, Iloilo" },
  { name: "Brgy. Balabag, Pavia", category: "barangay", lng: 122.5410, lat: 10.7650, aliases: ["balabag pavia"], context: "Pavia, Iloilo" },
  { name: "Brgy. Traciana, Pavia", category: "barangay", lng: 122.5400, lat: 10.7700, aliases: ["traciana"], context: "Pavia, Iloilo" },

  // ══════════════════════════════════════════════════════════════
  //  MAJOR ROADS
  // ══════════════════════════════════════════════════════════════
  { name: "Benigno Aquino Avenue", category: "road", lng: 122.5560, lat: 10.7110, aliases: ["benigno aquino", "diversion road"], context: "Mandurriao, Iloilo City" },
  { name: "General Luna Street", category: "road", lng: 122.5660, lat: 10.6940, aliases: ["gen luna", "general luna"], context: "City Proper, Iloilo City" },
  { name: "JM Basa Street", category: "road", lng: 122.5645, lat: 10.6950, aliases: ["jm basa"], context: "City Proper, Iloilo City" },
  { name: "Iznart Street", category: "road", lng: 122.5660, lat: 10.6950, aliases: ["iznart"], context: "City Proper, Iloilo City" },
  { name: "Ledesma Street", category: "road", lng: 122.5640, lat: 10.6935, aliases: ["ledesma"], context: "City Proper, Iloilo City" },
  { name: "Delgado Street", category: "road", lng: 122.5655, lat: 10.6955, aliases: ["delgado"], context: "City Proper, Iloilo City" },
  { name: "Lopez Jaena Street, Jaro", category: "road", lng: 122.5690, lat: 10.7280, aliases: ["lopez jaena street"], context: "Jaro, Iloilo City" },
  { name: "E. Lopez Street, Jaro", category: "road", lng: 122.5700, lat: 10.7260, aliases: ["e lopez", "e. lopez"], context: "Jaro, Iloilo City" },
  { name: "Jalandoni Street", category: "road", lng: 122.5670, lat: 10.6960, aliases: ["jalandoni"], context: "City Proper, Iloilo City" },
  { name: "Iloilo-Capiz Road", category: "road", lng: 122.5500, lat: 10.7500, aliases: ["national highway", "iloilo capiz road"], context: "Pavia, Iloilo" },

  // ══════════════════════════════════════════════════════════════
  //  PANAY ISLAND CITIES & MUNICIPALITIES
  // ══════════════════════════════════════════════════════════════
  // Iloilo Province
  { name: "Iloilo City", category: "city", lng: 122.5654, lat: 10.7202, aliases: ["iloilo"], context: "Iloilo" },
  { name: "Pavia, Iloilo", category: "city", lng: 122.5430, lat: 10.7720, aliases: ["pavia"], context: "Iloilo" },
  { name: "Oton, Iloilo", category: "city", lng: 122.4830, lat: 10.6930, aliases: ["oton"], context: "Iloilo" },
  { name: "Leganes, Iloilo", category: "city", lng: 122.5690, lat: 10.7870, aliases: ["leganes"], context: "Iloilo" },
  { name: "Santa Barbara, Iloilo", category: "city", lng: 122.5310, lat: 10.8200, aliases: ["santa barbara", "sta barbara"], context: "Iloilo" },
  { name: "San Miguel, Iloilo", category: "city", lng: 122.5540, lat: 10.8600, aliases: ["san miguel"], context: "Iloilo" },
  { name: "Pototan, Iloilo", category: "city", lng: 122.6350, lat: 10.9450, aliases: ["pototan"], context: "Iloilo" },
  { name: "Cabatuan, Iloilo", category: "city", lng: 122.4870, lat: 10.8800, aliases: ["cabatuan"], context: "Iloilo" },
  { name: "Leon, Iloilo", category: "city", lng: 122.3900, lat: 10.7800, aliases: ["leon"], context: "Iloilo" },
  { name: "Tigbauan, Iloilo", category: "city", lng: 122.3780, lat: 10.6780, aliases: ["tigbauan"], context: "Iloilo" },
  { name: "Miagao, Iloilo", category: "city", lng: 122.2350, lat: 10.6440, aliases: ["miagao"], context: "Iloilo" },
  { name: "Guimbal, Iloilo", category: "city", lng: 122.3220, lat: 10.6600, aliases: ["guimbal"], context: "Iloilo" },
  { name: "Dumangas, Iloilo", category: "city", lng: 122.7130, lat: 10.8310, aliases: ["dumangas"], context: "Iloilo" },
  { name: "Zarraga, Iloilo", category: "city", lng: 122.6080, lat: 10.8240, aliases: ["zarraga"], context: "Iloilo" },
  { name: "New Lucena, Iloilo", category: "city", lng: 122.6830, lat: 10.8810, aliases: ["new lucena"], context: "Iloilo" },
  { name: "Passi City, Iloilo", category: "city", lng: 122.6380, lat: 11.1050, aliases: ["passi"], context: "Iloilo" },
  { name: "Barotac Nuevo, Iloilo", category: "city", lng: 122.7050, lat: 10.8850, aliases: ["barotac nuevo"], context: "Iloilo" },
  { name: "Banate, Iloilo", category: "city", lng: 122.7900, lat: 10.9400, aliases: ["banate"], context: "Iloilo" },
  { name: "Anilao, Iloilo", category: "city", lng: 122.7500, lat: 10.9750, aliases: ["anilao iloilo"], context: "Iloilo" },
  { name: "Sara, Iloilo", category: "city", lng: 122.5900, lat: 11.2500, aliases: ["sara"], context: "Iloilo" },
  { name: "Concepcion, Iloilo", category: "city", lng: 122.4800, lat: 11.4700, aliases: ["concepcion"], context: "Iloilo" },
  { name: "Estancia, Iloilo", category: "city", lng: 122.4400, lat: 11.4400, aliases: ["estancia"], context: "Iloilo" },
  { name: "San Dionisio, Iloilo", category: "city", lng: 122.5750, lat: 11.2700, aliases: ["san dionisio"], context: "Iloilo" },
  { name: "Janiuay, Iloilo", category: "city", lng: 122.5100, lat: 10.9500, aliases: ["janiuay"], context: "Iloilo" },
  { name: "Maasin, Iloilo", category: "city", lng: 122.4530, lat: 10.8450, aliases: ["maasin"], context: "Iloilo" },
  { name: "Alimodian, Iloilo", category: "city", lng: 122.4300, lat: 10.8200, aliases: ["alimodian"], context: "Iloilo" },
  // Aklan
  { name: "Kalibo, Aklan", category: "city", lng: 122.3680, lat: 11.7080, aliases: ["kalibo"], context: "Aklan" },
  { name: "Boracay Island", category: "tourist", lng: 121.9674, lat: 11.9674, aliases: ["boracay"], context: "Malay, Aklan" },
  { name: "Malay, Aklan", category: "city", lng: 121.9100, lat: 11.8800, aliases: ["malay"], context: "Aklan" },
  // Capiz
  { name: "Roxas City, Capiz", category: "city", lng: 122.7510, lat: 11.5850, aliases: ["roxas city", "roxas"], context: "Capiz" },
  // Antique
  { name: "San Jose de Buenavista, Antique", category: "city", lng: 121.9430, lat: 10.7440, aliases: ["san jose antique", "san jose de buenavista"], context: "Antique" },
];

// ══════════════════════════════════════════════════════════════
//  SEARCH ENGINE
// ══════════════════════════════════════════════════════════════

/**
 * Search landmarks by fuzzy text match.
 * Supports word-boundary matching and multi-word queries.
 * Returns top matches sorted by relevance.
 */
export function searchLandmarks(query: string, limit = 5): Array<Landmark & { score: number }> {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const qWords = q.split(/\s+/);

  const scored = PANAY_LANDMARKS.map((lm) => {
    const nameLower = lm.name.toLowerCase();
    const contextLower = (lm.context || "").toLowerCase();
    const fullText = `${nameLower} ${contextLower}`;
    let score = 0;

    // Exact name match
    if (nameLower === q) score = 100;
    // Name starts with query
    else if (nameLower.startsWith(q)) score = 80;
    // Name contains query
    else if (nameLower.includes(q)) score = 60;
    // Check aliases
    else {
      for (const alias of lm.aliases || []) {
        if (alias === q) { score = 90; break; }
        if (alias.startsWith(q)) { score = 70; break; }
        if (alias.includes(q)) { score = 50; break; }
      }
    }

    // Multi-word matching: all query words found in full text
    if (score === 0 && qWords.length > 1) {
      const allFound = qWords.every(w => fullText.includes(w));
      if (allFound) score = 45;
    }

    // Single word partial match in any alias word
    if (score === 0) {
      for (const alias of lm.aliases || []) {
        const aliasWords = alias.split(/\s+/);
        for (const aw of aliasWords) {
          if (aw.startsWith(q)) { score = 40; break; }
        }
        if (score > 0) break;
      }
    }

    // Word-boundary match in name
    if (score === 0) {
      const nameWords = nameLower.split(/[\s,.\-()]+/);
      for (const w of nameWords) {
        if (w.startsWith(q)) { score = 35; break; }
      }
    }

    // Category priority boost
    if (score > 0) {
      const boosts: Record<string, number> = {
        mall: 6, transport: 5, hospital: 5, university: 4,
        subdivision: 4, government: 3, school: 3, church: 2,
        commercial: 2, barangay: 1, tourist: 1, road: 1, city: 0,
      };
      score += boosts[lm.category] || 0;
    }

    return { ...lm, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * Find the nearest landmark to a coordinate within a given radius (km).
 * Useful for enriching reverse-geocoded addresses.
 */
export function nearestLandmark(
  lng: number,
  lat: number,
  radiusKm = 0.5,
  categories?: LandmarkCategory[]
): Landmark | null {
  let best: Landmark | null = null;
  let bestDist = Infinity;

  for (const lm of PANAY_LANDMARKS) {
    if (categories && !categories.includes(lm.category)) continue;
    const d = haversineKm(lat, lng, lm.lat, lm.lng);
    if (d < radiusKm && d < bestDist) {
      bestDist = d;
      best = lm;
    }
  }
  return best;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
