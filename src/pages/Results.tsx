import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  WCTCard, 
  WCTButton, 
  WCTSummaryRow, 
  WCTAlert 
} from '../components/WCTComponents';
import { AuthModal } from '../components/AuthModal';
import { SmartTechModal } from '../components/SmartTechModal';
import { GeminiAssistant } from '../components/GeminiAssistant';
import { motion, AnimatePresence } from 'motion/react';
import { Share2, Mail, Edit2, CheckCircle2, Save } from 'lucide-react';

export default function Results() {
  const { estimateId } = useParams();
  const [estimate, setEstimate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  useEffect(() => {
    const fetchEstimate = async () => {
      try {
        const res = await fetch(`/api/net-to-seller/estimate/${estimateId}`);
        if (!res.ok) throw new Error("Estimate not found");
        const data = await res.json();
        setEstimate(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchEstimate();
  }, [estimateId]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/net-to-seller/results/${estimateId}?t=${estimate.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="animate-pulse text-[#004EA8] font-montserrat uppercase tracking-widest">Loading Estimate...</div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-white p-6">
      <WCTCard className="max-w-md w-full text-center">
        <h2 className="text-red-500 mb-4">Error</h2>
        <p className="text-[#A2B2C8] mb-6">{error}</p>
        <Link to="/net-to-seller">
          <WCTButton fullWidth>Back to Calculator</WCTButton>
        </Link>
      </WCTCard>
    </div>
  );

  let calcJson;
  try {
    calcJson = JSON.parse(estimate.calcJson || '{}');
    if (typeof calcJson === 'string') {
      calcJson = JSON.parse(calcJson);
    }
  } catch (e) {
    calcJson = {};
  }
  const scenarios = calcJson.scenarios && calcJson.scenarios.length > 0 ? calcJson.scenarios : [estimate];

  return (
    <div className="min-h-screen bg-wct-slate/5 py-12 px-6 flex items-center justify-center">
      <div className={`max-w-${scenarios.length > 1 ? '7xl' : '3xl'} w-full relative`}>
        {/* Close Button (Mock for pop-up feel) */}
        <Link to="/net-to-seller" className="absolute -top-12 right-0 text-wct-slate hover:text-wct-blue transition-colors p-2">
          <span className="text-xs uppercase tracking-widest font-bold">Close</span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-8 text-center">
            <div className="flex justify-center mb-6">
              <img 
                src="https://images.squarespace-cdn.com/content/v1/5f4d40b11b4f1e6a11b920b5/1598967776211-2JVFU1R4U8PQM71BWUVE/WorldClassTitle_Logos-RGB-Primary.png" 
                alt="World Class Title" 
                className="h-16 object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <h1 className="text-3xl md:text-4xl text-[#004EA8] mb-2">Estimated Net Proceeds</h1>
            <p className="text-[#A2B2C8] font-subheader">{estimate.addressFull}</p>
          </div>

          <div className={`grid grid-cols-1 ${scenarios.length === 2 ? 'md:grid-cols-2' : scenarios.length === 3 ? 'md:grid-cols-3' : ''} gap-6 mb-8`}>
            {scenarios.map((scenario: any, index: number) => {
              const netProceeds = scenario.netProceeds ?? scenario.estimatedNetProceeds;
              const salePrice = scenario.salePrice;
              const commission = scenario.commissionAmount;
              const payoffs = scenario.payoffsTotal ?? scenario.mortgagePayoffsTotal;
              const credits = scenario.creditsTotal ?? scenario.sellerCreditsTotal;
              const closingCosts = scenario.estimatedClosingCosts ?? scenario.estimatedClosingCostsTotal;
              const titlePremium = scenario.estimatedTitlePremium;
              const transferTax = scenario.estimatedTransferTax;
              const taxProration = scenario.estimatedTaxProration;
              const hoaTransfer = estimate.hoaTransferFee ?? 0;
              const otherCosts = estimate.otherCostsTotal ?? 0;
              const closingDetails = scenario.closingCostsBreakdown;

              return (
                <WCTCard key={index} className="overflow-hidden shadow-2xl shadow-wct-blue/5 h-full flex flex-col">
                  <div className="bg-[#004EA8]/5 -mx-8 -mt-8 p-8 text-center border-b border-[#A2B2C8]/10 mb-8">
                    <span className="text-[#A2B2C8] uppercase text-sm tracking-widest mb-2 block font-bold">
                      {scenarios.length > 1 ? (index === 0 ? 'Primary Estimate' : `Option ${index + 1}`) : 'Estimated Net'}
                    </span>
                    <div className="text-4xl md:text-5xl font-bold text-[#004EA8] font-nunito">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(netProceeds)}
                    </div>
                  </div>

                  <div className="space-y-1 flex-grow">
                    <WCTSummaryRow label="Sale Price" value={salePrice} />
                    <WCTSummaryRow label="Real Estate Commission" value={-commission} />
                    <WCTSummaryRow label="Mortgage Payoffs" value={-payoffs} />
                    <WCTSummaryRow label="Seller Credits" value={-credits} />
                    <WCTSummaryRow 
                      label="Closing Costs" 
                      value={-closingCosts} 
                      details={closingDetails}
                    />
                    <WCTSummaryRow label="Title Insurance (OTIRB)" value={-titlePremium} />
                    <WCTSummaryRow label="Transfer Tax" value={-transferTax} />
                    <WCTSummaryRow label="Tax Proration" value={-taxProration} />
                    {hoaTransfer > 0 && <WCTSummaryRow label="HOA Transfer Fee" value={-hoaTransfer} />}
                    {otherCosts > 0 && <WCTSummaryRow label="Other Costs" value={-otherCosts} />}
                    <WCTSummaryRow label="Net Proceeds" value={netProceeds} isTotal />
                  </div>
                </WCTCard>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12 max-w-3xl mx-auto">
            <WCTButton variant="outline" onClick={() => window.history.back()}>
              <Edit2 className="w-4 h-4" /> Edit
            </WCTButton>
            <WCTButton variant="secondary" onClick={handleCopyLink}>
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy Link'}
            </WCTButton>
            <WCTButton onClick={() => setShowAuth(true)}>
              <Save className="w-4 h-4" /> Save Estimate
            </WCTButton>
            <WCTButton onClick={() => window.open('https://www.worldclasstitle.com', '_blank')}>
              Order Marketing
            </WCTButton>
          </div>

          {authSuccess && (
            <WCTAlert type="info">
              <div className="flex flex-col gap-2">
                <p className="font-bold text-lg">Account Created!</p>
                <p>Your estimate has been saved to your dashboard. You can now order marketing services directly.</p>
                <WCTButton onClick={() => window.open('https://www.worldclasstitle.com', '_blank')} className="mt-2 w-full md:w-auto">
                  Start Marketing Order
                </WCTButton>
              </div>
            </WCTAlert>
          )}

          <div className="space-y-6 mt-6">
            <WCTAlert type="info">
              <p className="leading-relaxed">
                <strong>Disclaimer:</strong> Estimates are for illustration only and may vary based on contract terms, prorations, lender requirements, county charges, and underwriting requirements. Final amounts will be confirmed by your World Class Title escrow officer.
              </p>
            </WCTAlert>
            <p className="text-[10px] text-wct-slate text-center italic uppercase tracking-wider font-bold">
              All estimates and assumptions must be consistent with Westcor underwriting guidelines and Ohio rate rules where applicable.
            </p>
          </div>
        </motion.div>
        
        <div className="mt-8 text-center pb-8">
          <button 
            onClick={() => setShowSmartModal(true)}
            className="text-[10px] text-wct-slate uppercase tracking-[2px] font-bold hover:text-wct-blue transition-colors"
          >
            Built by Smart, exclusively for World Class Title
          </button>
        </div>
      </div>
      
      <AuthModal 
        isOpen={showAuth} 
        onClose={() => setShowAuth(false)} 
        onSuccess={() => {
          setShowAuth(false);
          setAuthSuccess(true);
        }}
      />

      <SmartTechModal 
        isOpen={showSmartModal} 
        onClose={() => setShowSmartModal(false)} 
      />
      
      <GeminiAssistant estimate={estimate} />
    </div>
  );
}
