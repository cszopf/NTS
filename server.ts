import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { WCT_CONFIG } from "./src/constants/config";
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Prioritize supabase_nts_api as requested
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.supabase_nts_api || process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const dbPath = process.env.DB_PATH || "nts.db";
const db = new Database(dbPath);

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS Users (
    id TEXT PRIMARY KEY,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    name TEXT,
    email TEXT,
    phone TEXT,
    brokerage TEXT,
    salesRep TEXT
  );

  CREATE TABLE IF NOT EXISTS NetToSellerEstimate (
    id TEXT PRIMARY KEY,
    userId TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    addressFull TEXT,
    unit TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    county TEXT,
    isOhio INTEGER,
    placeId TEXT,
    lat REAL,
    lng REAL,
    ownerName TEXT,
    ownerMailingAddress TEXT,
    parcelNumber TEXT,
    propertyType TEXT,
    beds INTEGER,
    baths REAL,
    sqft INTEGER,
    taxYear INTEGER,
    annualTaxes REAL,
    homestead INTEGER,
    salePrice REAL,
    closingDate TEXT,
    commissionType TEXT,
    commissionValue REAL,
    commissionAmount REAL,
    sellerCreditsTotal REAL,
    mortgagePayoffs TEXT,
    mortgagePayoffsTotal REAL,
    homeWarranty REAL,
    hoaMonthly REAL,
    hoaTransferFee REAL,
    otherCosts TEXT,
    otherCostsTotal REAL,
    estimatedClosingCostsTotal REAL,
    estimatedTitlePremium REAL,
    estimatedTransferTax REAL,
    estimatedTaxProration REAL,
    estimatedNetProceeds REAL,
    inputsJson TEXT,
    calcJson TEXT,
    shareToken TEXT,
    shareCount INTEGER DEFAULT 0,
    FOREIGN KEY(userId) REFERENCES Users(id)
  )
`);

try {
  db.exec("ALTER TABLE NetToSellerEstimate ADD COLUMN userId TEXT");
} catch (err: any) {
  if (!err.message.includes("duplicate column name")) {
    console.log("Migration note:", err.message);
  }
}

try {
  db.exec("ALTER TABLE NetToSellerEstimate ADD COLUMN estimatedTitlePremium REAL");
  console.log("Added estimatedTitlePremium column to database");
} catch (err: any) {
  if (!err.message.includes("duplicate column name")) {
    console.log("Migration note:", err.message);
  }
}

try {
  db.exec("ALTER TABLE NetToSellerEstimate ADD COLUMN homeWarranty REAL");
  console.log("Added homeWarranty column to database");
} catch (err: any) {
  if (!err.message.includes("duplicate column name")) {
    console.log("Migration note:", err.message);
  }
}

const cleanNum = (val: any): number => {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return 0;
  const cleaned = Number(val.replace(/[^0-9.-]+/g, ""));
  return isNaN(cleaned) ? 0 : cleaned;
};

// --- NEW 2026 OTIRB TITLE INSURANCE LOGIC ---
function calculateTitlePremium(salePrice: number, policyType: string, reissueEnabled: boolean, priorAmount: number) {
  const roundedAmount = Math.ceil(salePrice / 1000) * 1000;
  let remainingAmount = roundedAmount;
  let basePremium = 0;
  const breakdown: string[] = [`Base Amount: $${roundedAmount.toLocaleString()}`];

  if (remainingAmount > 0) {
      const tier1 = Math.min(remainingAmount, 250000);
      const tierCost = (tier1 / 1000) * 5.80;
      basePremium += tierCost;
      breakdown.push(`Tier 1 (Up to $250k): $${tier1.toLocaleString()} @ $5.80/k = $${tierCost.toFixed(2)}`);
      remainingAmount -= tier1;
  }
  if (remainingAmount > 0) {
      const tier2 = Math.min(remainingAmount, 250000);
      const tierCost = (tier2 / 1000) * 4.10;
      basePremium += tierCost;
      breakdown.push(`Tier 2 ($250k-$500k): $${tier2.toLocaleString()} @ $4.10/k = $${tierCost.toFixed(2)}`);
      remainingAmount -= tier2;
  }
  if (remainingAmount > 0) {
      const tier3 = Math.min(remainingAmount, 500000);
      const tierCost = (tier3 / 1000) * 3.20;
      basePremium += tierCost;
      breakdown.push(`Tier 3 ($500k-$1M): $${tier3.toLocaleString()} @ $3.20/k = $${tierCost.toFixed(2)}`);
      remainingAmount -= tier3;
  }
  if (remainingAmount > 0) {
      const tier4 = Math.min(remainingAmount, 4000000);
      const tierCost = (tier4 / 1000) * 3.10;
      basePremium += tierCost;
      breakdown.push(`Tier 4 ($1M-$5M): $${tier4.toLocaleString()} @ $3.10/k = $${tierCost.toFixed(2)}`);
      remainingAmount -= tier4;
  }

  let grossPremium = basePremium;
  if (typeof policyType === 'string' && policyType.toLowerCase().includes('homeowner')) {
      const surcharge = basePremium * 0.15;
      grossPremium += surcharge;
      breakdown.push(`Homeowner Surcharge: +$${surcharge.toFixed(2)}`);
  }

  let credit = 0;
  if (reissueEnabled && priorAmount > 0) {
      const cappedPrior = Math.min(priorAmount, salePrice);
      const { premium: priorBasePremium } = calculateTitlePremium(cappedPrior, 'standard', false, 0);
      credit = priorBasePremium * 0.30;
      breakdown.push(`Reissue Credit Applied (30% of prior premium): -$${credit.toFixed(2)}`);
  }

  let finalPremium = grossPremium - credit;

  const min = (typeof policyType === 'string' && policyType.toLowerCase().includes('homeowner')) ? 250 : 225;
  if (finalPremium < min) {
      finalPremium = min;
      breakdown.push(`Using minimum premium: $${min}`);
  }

  return { premium: parseFloat(finalPremium.toFixed(2)), breakdown };
}

async function startServer() {
  const app = express();
  app.use(express.json());
  const PORT = 3000;

  app.post("/api/net-to-seller/property-lookup", async (req, res) => {
    const { placeId, addressFull, lat, lng, city, state, zip } = req.body;
    
    const isOhio = addressFull?.toLowerCase().includes("oh") || addressFull?.toLowerCase().includes("ohio");
    if (!isOhio) {
      return res.status(400).json({ error: "This tool is currently available for Ohio properties only." });
    }

    try {
      const attomKey = process.env.ATTOM_API;
      if (!attomKey) {
        return res.status(500).json({ error: "ATTOM API key is not configured." });
      }

      let address1 = "";
      let address2 = "";

      if (city && state) {
        address2 = `${city}, ${state}`;
        if (zip) address2 += ` ${zip}`;
        const cityIndex = addressFull.indexOf(city);
        if (cityIndex > 0) {
          let part1 = addressFull.substring(0, cityIndex).trim();
          while (part1.endsWith(',')) part1 = part1.slice(0, -1).trim();
          address1 = part1;
        } else {
          const parts = addressFull.split(',');
          address1 = parts[0].trim();
        }
      } else {
        const firstCommaIndex = addressFull.indexOf(',');
        if (firstCommaIndex !== -1) {
          address1 = addressFull.substring(0, firstCommaIndex).trim();
          address2 = addressFull.substring(firstCommaIndex + 1).trim();
        } else {
          address1 = addressFull;
        }
      }
      
      address2 = address2.replace(', USA', '').replace(', US', '').trim();

      if (!address1 || !address2) {
        return res.json({ success: false, message: "Could not parse address into street and city/state." });
      }

      let ownerName = "";
      let parcelNumber = "";
      let annualTaxes = 0;
      let propertyType = "";
      let beds = 0;
      let baths = 0;
      let sqft = 0;
      let taxYear = new Date().getFullYear() - 1;
      let priorSalePrice = 0;
      let priorSaleDate = "";
      let comps: any[] = [];
      let avmValue = 0;
      let avmLow = 0;
      let avmHigh = 0;

      const attomUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;
      const attomResponse = await fetch(attomUrl, { headers: { 'apikey': attomKey, 'Accept': 'application/json' } });

      if (!attomResponse.ok) {
        throw new Error(`ATTOM API responded with status: ${attomResponse.status}`);
      }

      const attomData = await attomResponse.json();
      const property = attomData.property?.[0];
      
      if (property) {
        const owner1 = property.assessment?.owner?.owner1;
        if (owner1?.fullName) ownerName = owner1.fullName;
        else if (owner1?.fullname) ownerName = owner1.fullname;
        else if (owner1?.firstNameAndMi && owner1?.lastName) ownerName = `${owner1.firstNameAndMi} ${owner1.lastName}`;
        else if (owner1?.firstname && owner1?.lastname) ownerName = `${owner1.firstname} ${owner1.lastname}`;
        
        if (property.identifier?.apn) parcelNumber = property.identifier.apn;
        if (property.assessment?.tax?.taxAmt) annualTaxes = property.assessment.tax.taxAmt;
        if (property.assessment?.tax?.taxYear) taxYear = parseInt(property.assessment.tax.taxYear);
        if (property.summary?.propclass) propertyType = property.summary.propclass;
        if (property.building?.rooms?.beds) beds = property.building.rooms.beds;
        if (property.building?.rooms?.bathstotal) baths = property.building.rooms.bathstotal;
        if (property.building?.size?.universalsize) sqft = property.building.size.universalsize;
        if (property.sale?.amount?.saleAmt) priorSalePrice = property.sale.amount.saleAmt;
        if (property.sale?.saleTransDate) priorSaleDate = property.sale.saleTransDate;

        try {
          const compsUrl = `https://api.gateway.attomdata.com/property/v2/salescomparables/address/${encodeURIComponent(address1)}/${encodeURIComponent(city || '')}/US/${encodeURIComponent(state || '')}/${encodeURIComponent(zip || '')}?searchType=Radius&minComps=1&maxComps=5&miles=2`;
          const compsResponse = await fetch(compsUrl, { headers: { 'apikey': attomKey, 'Accept': 'application/json' } });
          if (compsResponse.ok) {
            const compsData = await compsResponse.json();
            let properties = compsData.RESPONSE_GROUP?.RESPONSE?.RESPONSE_DATA?.PROPERTY_INFORMATION_RESPONSE_ext?.SUBJECT_PROPERTY_ext?.PROPERTY || [];
            if (!Array.isArray(properties)) properties = [properties];
            
            const filteredProperties = properties.filter((p: any) => p && p.COMPARABLE_PROPERTY_ext);
            comps = filteredProperties.map((p: any) => {
              const comp = p.COMPARABLE_PROPERTY_ext?.PROPERTY;
              if (!comp) return null;
              
              const addressObj = comp.address || {};
              const addressStr = addressObj.oneLine || 
                              `${addressObj.line1 || ''}, ${addressObj.locality || ''}, ${addressObj.countrySubd || ''} ${addressObj.postal1 || ''}`.replace(/^[,\s]+|[,\s]+$/g, '');
              return {
                address: addressStr,
                salePrice: comp.sale?.amount?.saleAmt || 0,
                saleDate: comp.sale?.saleTransDate || '',
                beds: comp.building?.rooms?.beds || 0,
                baths: comp.building?.rooms?.bathstotal || 0,
                sqft: comp.building?.size?.universalsize || 0
              };
            }).filter(Boolean);
          }
        } catch (compsError) {
          console.error("ATTOM Comps Lookup Failed:", compsError);
        }

        try {
          const avmUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/avm/snapshot?address1=${encodeURIComponent(address1)}&address2=${encodeURIComponent(address2)}`;
          const avmResponse = await fetch(avmUrl, { headers: { 'apikey': attomKey, 'Accept': 'application/json' } });
          if (avmResponse.ok) {
            const avmData = await avmResponse.json();
            const avm = avmData.property?.[0]?.avm?.amount;
            avmValue = avm?.value || 0;
            avmLow = avm?.low || 0;
            avmHigh = avm?.high || 0;
          }
        } catch (avmError) {
          console.error("ATTOM AVM Lookup Failed:", avmError);
        }
      } else {
        return res.json({ success: false, message: "Could not find property records." });
      }

      return res.json({
        success: true,
        data: {
          isOhio: true,
          ownerName,
          parcelNumber,
          annualTaxes,
          propertyType,
          beds,
          baths,
          sqft,
          taxYear,
          priorSalePrice,
          priorSaleDate,
          comps,
          avmValue,
          avmLow,
          avmHigh
        }
      });

    } catch (error) {
      console.error("Property Lookup API Error:", error);
      res.json({ success: false, message: "Could not find property records." });
    }
  });

  app.post("/api/net-to-seller/calculate", (req, res) => {
    const inputs = req.body;
    
    const calculateForPrice = (price: number) => {
      if (!price) return null;
      
      let commissionAmount = 0;
      if (inputs.payingCommission === 'yes') {
        if (inputs.commissionType === 'percent') {
          const sellerComm = (price * (Number(inputs.sellerCommission || 0) / 100));
          const buyerComm = (price * (Number(inputs.buyerCommission || 0) / 100));
          commissionAmount = sellerComm + buyerComm + cleanNum(inputs.brokerageFee);
        } else {
          commissionAmount = cleanNum(inputs.commissionValue) + cleanNum(inputs.brokerageFee);
        }
      }
        
      const payoffsTotal = (inputs.mortgagePayoffs || []).reduce((acc: number, p: any) => acc + (Number(p.amount) || 0), 0);
      const homeWarranty = Number(inputs.homeWarranty || 0);
      const creditsTotal = Number(inputs.sellerConcessions || 0) + 
                           Number(inputs.repairCredits || 0) + 
                           Number(inputs.otherCredits || 0);
      
      const otherCostsTotal = (inputs.otherCosts || []).reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0);
      
      // Use config for fees
      const fees = WCT_CONFIG.feeSchedule;
      const estimatedClosingCosts = Object.values(fees).reduce((a, b) => a + b, 0);
      const closingCostsBreakdown = Object.entries(fees).map(([label, value]) => ({ label, value }));
      
      // Transfer tax based on county
      const county = inputs.county || 'default';
      const rate = (WCT_CONFIG.transferTaxRates as any)[county] || WCT_CONFIG.transferTaxRates.default;
      const estimatedTransferTax = price * rate;

      // Tax proration
      const annualTaxes = Number(inputs.annualTaxes) || 0;
      const estimatedTaxProration = annualTaxes / 2;

      // Title Premium (OTIRB)
      let estimatedTitlePremium = 0;
      let titlePremiumBreakdown: string[] = [];
      
      if (WCT_CONFIG.settings.includeTitlePremium) {
        // Fix 1: Use .includes('yes') to catch "Yes (30% Discount)" from the UI
        const reissueStr = String(inputs.reissueCredit || '').toLowerCase();
        const reissueEnabled = reissueStr.includes('yes') || reissueStr === 'true';
        
        // Fix 2: Safely check both possible variable names for the Prior Policy
        const priorPrice = cleanNum(inputs.priorPolicyAmount) || cleanNum(inputs.priorSalePrice);
        
        console.log("Calculating Title Premium with:", { price, policyType: inputs.policyType, reissueEnabled, priorPrice });
        
        const result = calculateTitlePremium(price, inputs.policyType, reissueEnabled, priorPrice);
        estimatedTitlePremium = result.premium;
        titlePremiumBreakdown = result.breakdown;
      }

      const netProceeds = price - commissionAmount - payoffsTotal - creditsTotal - homeWarranty - 
                          estimatedClosingCosts - estimatedTransferTax - estimatedTaxProration - 
                          estimatedTitlePremium - (Number(inputs.hoaTransferFee) || 0) - otherCostsTotal;

      return {
        salePrice: price,
        commissionAmount,
        payoffsTotal,
        creditsTotal,
        homeWarranty,
        estimatedClosingCosts,
        closingCostsBreakdown,
        estimatedTransferTax,
        estimatedTaxProration,
        estimatedTitlePremium,
        titlePremiumBreakdown,
        netProceeds
      };
    };

    // Use cleanNum to prevent NaN from string formats like "$800,000.00"
    const primary = calculateForPrice(cleanNum(inputs.salePrice));
    const scenario2 = calculateForPrice(cleanNum(inputs.salePrice2));
    const scenario3 = calculateForPrice(cleanNum(inputs.salePrice3));

    // Stream search data to Supabase silently
    if (supabaseUrl && supabaseKey) {
      supabase.from('agent_searches').insert([{
        searched_address: inputs.address || inputs.propertyAddress || inputs.addressFull || 'Unknown Address',
        sale_price: cleanNum(inputs.salePrice) || 0,
        net_to_seller: primary?.netProceeds || 0
      }]).then(({ error }) => {
        if (error) console.error('Supabase Search Log Error:', error.message);
        else console.log('Successfully logged agent search to Supabase.');
      });
    }

    // Legacy response format for primary + scenarios array
    res.json({
      ...primary,
      estimatedNetProceeds: primary?.netProceeds,
      mortgagePayoffsTotal: primary?.payoffsTotal,
      sellerCreditsTotal: primary?.creditsTotal,
      otherCostsTotal: (inputs.otherCosts || []).reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0),
      estimatedClosingCostsTotal: primary?.estimatedClosingCosts,
      scenarios: [primary, scenario2, scenario3].filter(Boolean),
      calcJson: JSON.stringify({
        breakdown: primary,
        scenarios: [primary, scenario2, scenario3].filter(Boolean)
      })
    });
  });

  // 4. Share Estimate
  app.post("/api/net-to-seller/share", (req, res) => {
    const { estimateId, recipientEmail } = req.body;
    const estimate = db.prepare("SELECT * FROM NetToSellerEstimate WHERE id = ?").get(estimateId);
    
    if (!estimate) return res.status(404).json({ error: "Estimate not found" });

    // Increment share count
    db.prepare("UPDATE NetToSellerEstimate SET shareCount = shareCount + 1 WHERE id = ?").run(estimateId);

    // In a real app, we would send an email here.
    console.log(`Emailing estimate ${estimateId} to ${recipientEmail}`);
    
    res.json({ success: true });
  });

  // 3. Create Estimate
  app.post("/api/net-to-seller/create", (req, res) => {
    const data = req.body;
    const id = crypto.randomUUID();
    const shareToken = crypto.randomUUID().split('-')[0];

    const stmt = db.prepare(`
      INSERT INTO NetToSellerEstimate (
        id, addressFull, unit, city, state, zip, county, isOhio, placeId, lat, lng,
        ownerName, ownerMailingAddress, parcelNumber, propertyType, beds, baths, sqft,
        taxYear, annualTaxes, homestead, salePrice, closingDate, commissionType,
        commissionValue, commissionAmount, sellerCreditsTotal, mortgagePayoffs,
        mortgagePayoffsTotal, homeWarranty, hoaMonthly, hoaTransferFee, otherCosts, otherCostsTotal,
        estimatedClosingCostsTotal, estimatedTitlePremium, estimatedTransferTax, estimatedTaxProration,
        estimatedNetProceeds, inputsJson, calcJson, shareToken
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id, data.addressFull, data.unit, data.city, data.state, data.zip, data.county, data.isOhio ? 1 : 0, data.placeId, data.lat, data.lng,
      data.ownerName, data.ownerMailingAddress, data.parcelNumber, data.propertyType, data.beds, data.baths, data.sqft,
      data.taxYear, data.annualTaxes, data.homestead ? 1 : 0, data.salePrice, data.closingDate, data.commissionType,
      data.commissionValue, data.commissionAmount, data.sellerCreditsTotal, JSON.stringify(data.mortgagePayoffs),
      data.mortgagePayoffsTotal, data.homeWarranty || 0, data.hoaMonthly, data.hoaTransferFee, JSON.stringify(data.otherCosts), data.otherCostsTotal,
      data.estimatedClosingCostsTotal, data.estimatedTitlePremium || 0, data.estimatedTransferTax, data.estimatedTaxProration,
      data.estimatedNetProceeds || data.netProceeds || 0, JSON.stringify(data.inputs), JSON.stringify(data.calcJson), shareToken
    );

    res.json({ id, shareToken });
  });

  // 4. Get Estimate (Internal for results page)
  app.get("/api/net-to-seller/estimate/:id", (req, res) => {
    const estimate = db.prepare("SELECT * FROM NetToSellerEstimate WHERE id = ?").get(req.params.id);
    if (!estimate) return res.status(404).json({ error: "Estimate not found" });
    res.json(estimate);
  });

  app.post("/api/net-to-seller/prospects", async (req, res) => {
    const { lat, lng } = req.body;
    const attomKey = process.env.ATTOM_API;

    if (!attomKey || !lat || !lng) {
      return res.json({ success: false, prospects: [] });
    }

    try {
      // Step 1: Get nearby properties via snapshot
      const snapshotUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/snapshot?latitude=${lat}&longitude=${lng}&radius=3&pageSize=40&propertytype=SINGLE%20FAMILY%20RESIDENCE`;
      const snapshotRes = await fetch(snapshotUrl, {
        headers: { apikey: attomKey, accept: 'application/json' }
      });

      if (!snapshotRes.ok) {
        const errorText = await snapshotRes.text();
        return res.status(400).json({ 
          success: false, 
          prospects: [], 
          errorDetail: 'ATTOM Snapshot Error: ' + errorText 
        });
      }

      const snapshotData = await snapshotRes.json();
      const initialProps = (snapshotData.property || []).slice(0, 40);
      
      if (initialProps.length === 0) {
        return res.json({ success: true, prospects: [] });
      }

      // Step 2 & 3: Fetch expanded profiles concurrently
      const profilePromises = initialProps.map(async (p: any) => {
        const attomId = p.identifier?.attomId;
        if (!attomId) return null;
        
        try {
          const expandedUrl = `https://api.gateway.attomdata.com/propertyapi/v1.0.0/property/expandedprofile?attomid=${attomId}`;
          const expandedRes = await fetch(expandedUrl, {
            headers: { apikey: attomKey, accept: 'application/json' }
          });
          
          if (!expandedRes.ok) return null;
          const data = await expandedRes.json();
          return data.property?.[0] || null;
        } catch (err) {
          return null;
        }
      });

      const properties = (await Promise.all(profilePromises)).filter(Boolean);

      // Step 4: Map and score detailed data
      const prospects = properties.map((p: any) => {
        let sellScore = 0;
        const tags: string[] = [];

        // Parse Owner Name
        const owner = p.assessment?.owner?.owner1;
        const ownerName = owner?.fullName || owner?.fullname || owner?.label || 'Unknown Owner';

        // Condition 1: Length of Ownership (High Equity / Life Event)
        const saleDateStr = p.sale?.amount?.saleRecDate || p.sale?.amount?.salerecdate;
        if (saleDateStr) {
          const saleDate = new Date(saleDateStr);
          const now = new Date();
          const diffYears = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          
          if (diffYears >= 15 && saleDate.getFullYear() > 1900) {
            sellScore += 3;
            tags.push("15+ Years Owned");
          } else if (diffYears >= 7 && saleDate.getFullYear() > 1900) {
            sellScore += 2;
            tags.push("7+ Years Owned");
          }
        }

        // Condition 2: Absentee / Investor
        if (p.summary?.absenteeInd === 'A') {
          sellScore += 2;
          tags.push("Absentee Owner");
        }

        // Condition 3: Corporate / Trust Offload
        if (ownerName.match(/\b(LLC|INC|TRUST|PARTNERS|CORP|COMPANY)\b/i)) {
          sellScore += 2;
          tags.push("Corporate/Trust Owner");
        }

        // Condition 4: Financial Distress (Tax Delinquency)
        const delinquentYear = p.assessment?.tax?.delinquentYear;
        if (delinquentYear && delinquentYear > 0) {
          sellScore += 3;
          tags.push("Tax Delinquent");
        }

        // Estimated Value Range Calculation
        let estimatedValueRange = 'Est. Value Unknown';
        const estimatedValue = p.assessment?.market?.mktTtlValue || p.assessment?.assessed?.assdTtlValue;
        
        if (estimatedValue) {
          const low = estimatedValue * 0.95;
          const high = estimatedValue * 1.05;
          
          const formatPrice = (val: number) => {
            if (val >= 1000000) {
              return `$${(val / 1000000).toFixed(1)}M`;
            }
            return `$${Math.round(val / 1000)}k`;
          };

          // User requested High - Low format: $1.7M - $1.4M
          estimatedValueRange = `Est. Value ${formatPrice(high)} - ${formatPrice(low)}`;
        }

        return {
          address: {
            oneLine: p.address?.oneLine || '',
            line1: p.address?.line1 || '',
            locality: p.address?.locality || '',
            countrySubd: p.address?.stateIndicator || '',
            postal1: p.address?.postalMemberCode || ''
          },
          mailingAddress: p.assessment?.owner?.mailingAddress?.oneLine || '',
          ownerName: ownerName,
          sellScore,
          tags,
          estimatedValueRange
        };
      });

      const top15 = prospects
      .filter((p: any) => p.sellScore > 0)
      .sort((a: any, b: any) => b.sellScore - a.sellScore)
      .slice(0, 15);

      // Stream data to Supabase silently
      const leadsToInsert = top15.map((p: any) => ({
        owner_name: p.ownerName || 'Unknown',
        property_address: p.address?.oneLine || p.address?.line1 || 'Unknown Address',
        sell_score: p.sellScore || 0,
        tags: p.tags ? p.tags.join(', ') : ''
      }));

      if (leadsToInsert.length > 0 && supabaseUrl && supabaseKey) {
        // Silently insert into Supabase without awaiting, so we don't slow down the user's UI
        supabase.from('prospect_leads').insert(leadsToInsert).then(({ error }) => {
          if (error) console.error('Supabase Insert Error:', error.message);
          else console.log(`Successfully logged ${leadsToInsert.length} leads to Supabase.`);
        });
      }

      res.json({ success: true, prospects: top15 });
    } catch (error: any) {
      console.error("Prospects API Error:", error);
      res.status(500).json({ 
        success: false, 
        prospects: [], 
        errorDetail: error.message 
      });
    }
  });

  // 5. Register User
  app.post("/api/register", (req, res) => {
    const { name, email, phone, brokerage, salesRep, estimateId } = req.body;
    
    if (!name || !email || !phone || !brokerage || !salesRep) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const userId = crypto.randomUUID();
    
    try {
      const stmt = db.prepare(`
        INSERT INTO Users (id, name, email, phone, brokerage, salesRep)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      stmt.run(userId, name, email, phone, brokerage, salesRep);
      
      if (estimateId) {
        const updateStmt = db.prepare(`
          UPDATE NetToSellerEstimate SET userId = ? WHERE id = ?
        `);
        updateStmt.run(userId, estimateId);
      }
      
      res.json({ success: true, userId });
    } catch (err: any) {
      console.error("Registration error:", err);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  // BatchData Skip Trace Endpoint
  app.post('/api/net-to-seller/skiptrace', async (req, res) => {
    const { prospects } = req.body;
    const batchDataKey = process.env.BATCHDATA_API_KEY;

    if (!batchDataKey) {
      return res.status(500).json({ success: false, error: "BatchData API Key not configured" });
    }

    try {
      // 1. Map and sanitize the addresses to guarantee strings
      const batchRequests = prospects
        .map((p: any) => ({
          propertyAddress: {
            street: String(p.address?.line1 || p.street || p.propertyAddress || '').trim(),
            city: String(p.address?.locality || p.city || '').trim(),
            state: String(p.address?.countrySubd || p.state || '').trim(),
            zip: String(p.address?.postal1 || p.zip || '').trim().substring(0, 5)
          }
        }))
        .filter((req: any) => req.propertyAddress.street && req.propertyAddress.city && req.propertyAddress.state && req.propertyAddress.zip);

      if (batchRequests.length === 0) {
        return res.status(400).json({ success: false, errorDetail: 'No valid addresses found in the payload.' });
      }

      const requestBody = {
        requests: batchRequests
      };

      // 2. CRITICAL DEBUG LOG: Print exactly what we are sending
      console.log('SENDING TO BATCHDATA:', JSON.stringify(requestBody, null, 2));

      // 3. Execute the fetch
      const batchResponse = await fetch('https://api.batchdata.com/api/v1/property/skip-trace', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${process.env.BATCHDATA_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!batchResponse.ok) {
        const errorText = await batchResponse.text();
        console.error('BATCHDATA ERROR:', errorText);
        // CRITICAL: Return the exact requestBody string inside the errorDetail so it renders on the UI
        return res.status(400).json({ 
          success: false, 
          errorDetail: `BatchData Error: ${errorText} | PAYLOAD SENT: ${JSON.stringify(requestBody)}` 
        });
      }

      const batchData = await batchResponse.json();
      
      // 5. Safely merge the results back into the prospects
      // Note: batchData.results array matches the order of batchRequests.
      let validIdx = 0;
      const enrichedProspects = prospects.map((p: any) => {
        const street = String(p.address?.line1 || p.street || p.propertyAddress || '').trim();
        const city = String(p.address?.locality || p.city || '').trim();
        const state = String(p.address?.countrySubd || p.state || '').trim();
        const zip = String(p.address?.postal1 || p.zip || '').trim().substring(0, 5);
        
        const isValid = street && city && state && zip;
        
        if (isValid) {
          const person = batchData.results?.[validIdx]?.persons?.[0];
          validIdx++;
          if (person) {
            return {
              ...p,
              phoneNumbers: person.phoneNumbers || [],
              emails: person.emails || []
            };
          }
        }
        return p;
      });

      res.json({ success: true, prospects: enrichedProspects });
    } catch (error: any) {
      console.error("Skip Trace API Error:", error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();