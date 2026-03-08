// Rule PR-1 & Rule PR-8 Verified 2026 Rates
export const WCT_CONFIG = {
  feeSchedule: {
    "Settlement Fee": 299,
    "Title Search Fee": 349,
    "Admin Fee": 199,
    "Delivery Fee": 40,
    "Deed Preparation": 70,
    "Recording Fee": 40,
  },
  settings: {
    includeTitlePremium: true, // Enabled as requested for OTIRB integration
    includeHOAProration: false,
  },
  // Ohio OTIRB Rate Schedule (PR-1)
  otirbRates: [
    { threshold: 0, rate: 5.80 },        // Up to $250k 
    { threshold: 250000, rate: 4.10 },   // $250k - $500k 
    { threshold: 500000, rate: 3.20 },   // $500k - $1M 
    { threshold: 1000000, rate: 3.10 },  // $1M - $5M 
    { threshold: 5000000, rate: 2.90 },  // $5M - $10M 
    { threshold: 10000000, rate: 2.60 }  // Over $10M 
  ],
  minPremium: {
    standard: 225,  // Rule PR-1 
    homeowner: 250  // Rule PR-1.1 [cite: 3397]
  },
  // Transfer tax rates by county
  transferTaxRates: {
    default: 0.004, // $4 per $1000
    'Cuyahoga': 0.004,
    'Franklin': 0.003,
    'Hamilton': 0.004,
  }
};
