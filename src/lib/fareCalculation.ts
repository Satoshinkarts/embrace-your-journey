/**
 * Standardized fare calculation for Habal rides.
 * Base fare: ₱40 + ₱10 per km + optional zone premium.
 */
const BASE_FARE = 40;
const RATE_PER_KM = 10;
const DEFAULT_DISTANCE_KM = 3;

export function calculateFare(distanceKm?: number | null, premiumFee?: number | null): number {
  const distance = distanceKm ?? DEFAULT_DISTANCE_KM;
  const premium = premiumFee ?? 0;
  return Math.round((BASE_FARE + RATE_PER_KM * distance + premium) * 100) / 100;
}
