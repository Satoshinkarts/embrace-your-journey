/**
 * Curated landmark dataset for Iloilo City and Panay Island (~100km radius).
 * Used to supplement Mapbox geocoding with locally-prioritized results.
 */

export interface Landmark {
  name: string;
  category: "mall" | "university" | "government" | "transport" | "church" | "commercial" | "tourist" | "city";
  lng: number;
  lat: number;
  aliases?: string[]; // search aliases
}

export const PANAY_LANDMARKS: Landmark[] = [
  // ── Major Malls ──────────────────────────────────────────────
  { name: "SM City Iloilo", category: "mall", lng: 122.5692, lat: 10.7132, aliases: ["sm iloilo", "sm city"] },
  { name: "Festive Walk Mall", category: "mall", lng: 122.5534, lat: 10.7200, aliases: ["festive walk", "megaworld festive"] },
  { name: "Robinsons Place Iloilo", category: "mall", lng: 122.5635, lat: 10.6972, aliases: ["robinsons iloilo", "robinsons place"] },
  { name: "Robinsons Jaro", category: "mall", lng: 122.5715, lat: 10.7280, aliases: ["robinsons jaro"] },
  { name: "Gaisano City Iloilo", category: "mall", lng: 122.5690, lat: 10.6930, aliases: ["gaisano"] },

  // ── Business & Commercial Districts ──────────────────────────
  { name: "Iloilo Business Park", category: "commercial", lng: 122.5538, lat: 10.7188, aliases: ["business park", "ibp"] },
  { name: "Megaworld Boulevard", category: "commercial", lng: 122.5530, lat: 10.7195, aliases: ["megaworld"] },
  { name: "Smallville Complex", category: "commercial", lng: 122.5600, lat: 10.7168, aliases: ["smallville"] },
  { name: "Atria Park District", category: "commercial", lng: 122.5598, lat: 10.7140, aliases: ["atria"] },
  { name: "Diversion Road", category: "commercial", lng: 122.5550, lat: 10.7100, aliases: ["diversion"] },
  { name: "Plazuela de Iloilo", category: "commercial", lng: 122.5450, lat: 10.7020, aliases: ["plazuela"] },

  // ── Government Buildings ─────────────────────────────────────
  { name: "Iloilo City Hall", category: "government", lng: 122.5668, lat: 10.6950, aliases: ["city hall"] },
  { name: "Iloilo Provincial Capitol", category: "government", lng: 122.5624, lat: 10.6982, aliases: ["capitol", "provincial capitol"] },
  { name: "Iloilo Convention Center", category: "government", lng: 122.5620, lat: 10.6975, aliases: ["convention center"] },

  // ── Universities & Schools ───────────────────────────────────
  { name: "Central Philippine University", category: "university", lng: 122.5710, lat: 10.7290, aliases: ["cpu", "central philippine"] },
  { name: "West Visayas State University", category: "university", lng: 122.5596, lat: 10.7175, aliases: ["wvsu", "west visayas"] },
  { name: "University of the Philippines Visayas", category: "university", lng: 122.4620, lat: 10.6460, aliases: ["up visayas", "upv", "up miagao"] },
  { name: "St. Paul University Iloilo", category: "university", lng: 122.5640, lat: 10.6970, aliases: ["st paul", "saint paul"] },
  { name: "Iloilo Science and Technology University", category: "university", lng: 122.5680, lat: 10.7020, aliases: ["isat u", "isatu"] },
  { name: "University of San Agustin", category: "university", lng: 122.5645, lat: 10.6960, aliases: ["usa", "san agustin"] },
  { name: "University of Iloilo", category: "university", lng: 122.5640, lat: 10.7000, aliases: ["ui", "phinma iloilo"] },

  // ── Churches & Tourist Landmarks ─────────────────────────────
  { name: "Jaro Cathedral", category: "church", lng: 122.5700, lat: 10.7265, aliases: ["jaro church", "national shrine"] },
  { name: "Molo Church", category: "church", lng: 122.5500, lat: 10.6950, aliases: ["molo church", "st. anne"] },
  { name: "Villa Arevalo Church", category: "church", lng: 122.5350, lat: 10.6850, aliases: ["arevalo church"] },
  { name: "La Paz Plaza", category: "tourist", lng: 122.5695, lat: 10.7110, aliases: ["la paz"] },
  { name: "Molo Plaza", category: "tourist", lng: 122.5498, lat: 10.6948, aliases: ["molo plaza"] },
  { name: "Esplanade", category: "tourist", lng: 122.5680, lat: 10.6920, aliases: ["esplanade", "iloilo esplanade"] },
  { name: "Museo Iloilo", category: "tourist", lng: 122.5622, lat: 10.6985, aliases: ["museo", "iloilo museum"] },

  // ── Transport Hubs ───────────────────────────────────────────
  { name: "Iloilo International Airport", category: "transport", lng: 122.4934, lat: 10.7133, aliases: ["airport", "ilo airport", "santa barbara airport"] },
  { name: "Iloilo Port Area", category: "transport", lng: 122.5690, lat: 10.6900, aliases: ["port", "iloilo port", "fort san pedro port"] },
  { name: "Tagbak Terminal", category: "transport", lng: 122.5480, lat: 10.7070, aliases: ["tagbak", "jaro terminal"] },
  { name: "Mohon Terminal", category: "transport", lng: 122.5520, lat: 10.7380, aliases: ["mohon"] },
  { name: "Ceres Bus Terminal Iloilo", category: "transport", lng: 122.5483, lat: 10.7068, aliases: ["ceres iloilo", "ceres terminal"] },

  // ── Hospitals ────────────────────────────────────────────────
  { name: "Iloilo Doctors' Hospital", category: "commercial", lng: 122.5615, lat: 10.7010, aliases: ["doctors hospital"] },
  { name: "The Medical City Iloilo", category: "commercial", lng: 122.5545, lat: 10.7192, aliases: ["medical city", "tmc iloilo"] },
  { name: "Western Visayas Medical Center", category: "government", lng: 122.5560, lat: 10.7170, aliases: ["wvmc"] },
  { name: "St. Paul's Hospital Iloilo", category: "commercial", lng: 122.5638, lat: 10.6968, aliases: ["st pauls hospital"] },

  // ── Panay Island Cities & Municipalities ─────────────────────
  { name: "Roxas City, Capiz", category: "city", lng: 122.7510, lat: 11.5850, aliases: ["roxas city", "roxas"] },
  { name: "Kalibo, Aklan", category: "city", lng: 122.3680, lat: 11.7080, aliases: ["kalibo"] },
  { name: "San Jose de Buenavista, Antique", category: "city", lng: 121.9430, lat: 10.7440, aliases: ["san jose antique", "san jose de buenavista"] },
  { name: "Passi City, Iloilo", category: "city", lng: 122.6380, lat: 11.1050, aliases: ["passi"] },
  { name: "Pavia, Iloilo", category: "city", lng: 122.5430, lat: 10.7720, aliases: ["pavia"] },
  { name: "Oton, Iloilo", category: "city", lng: 122.4830, lat: 10.6930, aliases: ["oton"] },
  { name: "Leganes, Iloilo", category: "city", lng: 122.5690, lat: 10.7870, aliases: ["leganes"] },
  { name: "Santa Barbara, Iloilo", category: "city", lng: 122.5310, lat: 10.8200, aliases: ["santa barbara"] },
  { name: "San Miguel, Iloilo", category: "city", lng: 122.5540, lat: 10.8600, aliases: ["san miguel"] },
  { name: "Pototan, Iloilo", category: "city", lng: 122.6350, lat: 10.9450, aliases: ["pototan"] },
  { name: "Cabatuan, Iloilo", category: "city", lng: 122.4870, lat: 10.8800, aliases: ["cabatuan"] },
  { name: "Leon, Iloilo", category: "city", lng: 122.3900, lat: 10.7800, aliases: ["leon"] },
  { name: "Tigbauan, Iloilo", category: "city", lng: 122.3780, lat: 10.6780, aliases: ["tigbauan"] },
  { name: "Miagao, Iloilo", category: "city", lng: 122.2350, lat: 10.6440, aliases: ["miagao"] },
  { name: "Guimbal, Iloilo", category: "city", lng: 122.3220, lat: 10.6600, aliases: ["guimbal"] },
  { name: "Dumangas, Iloilo", category: "city", lng: 122.7130, lat: 10.8310, aliases: ["dumangas"] },
  { name: "Zarraga, Iloilo", category: "city", lng: 122.6080, lat: 10.8240, aliases: ["zarraga"] },
  { name: "New Lucena, Iloilo", category: "city", lng: 122.6830, lat: 10.8810, aliases: ["new lucena"] },
];

/**
 * Search landmarks by fuzzy text match.
 * Returns top matches sorted by relevance.
 */
export function searchLandmarks(query: string, limit = 5): Array<Landmark & { score: number }> {
  const q = query.toLowerCase().trim();
  if (q.length < 2) return [];

  const scored = PANAY_LANDMARKS.map((lm) => {
    const nameLower = lm.name.toLowerCase();
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

    // Category priority boost
    if (score > 0) {
      const boosts: Record<string, number> = { mall: 5, transport: 4, university: 3, government: 2, church: 1 };
      score += boosts[lm.category] || 0;
    }

    return { ...lm, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}
