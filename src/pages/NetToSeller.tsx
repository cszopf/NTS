import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  WCTCard, 
  WCTButton, 
  WCTInput, 
  WCTSelect, 
  WCTStepIndicator, 
  WCTAlert 
} from '../components/WCTComponents';
import { SmartTechModal } from '../components/SmartTechModal';
import { AddressAutocomplete } from '../components/AddressAutocomplete';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, ChevronRight, ChevronLeft, Calculator, Percent, X, Shield, CheckCircle2 } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import { WCT_CONFIG } from '../constants/config';

const ReissueModal = ({ isOpen, onClose, priorAmount }: { isOpen: boolean; onClose: () => void; priorAmount: string }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative overflow-hidden"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
              <Percent className="w-6 h-6 text-emerald-600" />
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Reissue Credit Applied!</h3>
            
            <p className="text-gray-600 mb-4">
              Good news! This property was sold less than 10 years ago. You may qualify for a reissue credit on the title insurance premium.
            </p>
            
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 mb-6 w-full text-left">
              <p className="text-sm text-emerald-800 mb-2 font-medium">Important Details:</p>
              <ul className="text-sm text-emerald-700 space-y-2 list-disc list-inside">
                <li>This is an estimate based on the prior sale price of <strong>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(priorAmount.replace(/[^0-9.]/g, '')))}</strong>.</li>
                <li>The discount applies only to the coverage amount up to this prior price.</li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 mb-6">
              Please collect the prior title insurance policy from the homeowner or the last title company they closed with. We will also attempt to locate this on your behalf.
            </p>
            
            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl transition-colors shadow-sm hover:shadow-md"
            >
              Got it, thanks!
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default function NetToSeller() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // 0: Start, 1: Property, 2: Sale, 3: Payoffs, 4: Agent, 5: Other
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lookupWarning, setLookupWarning] = useState<string | null>(null);
  const [showReissueModal, setShowReissueModal] = useState(false);
  const [showSmartModal, setShowSmartModal] = useState(false);

  const { width, height } = useWindowSize();
  const [logoClicks, setLogoClicks] = useState(0);
  const [showConfetti, setShowConfetti] = useState(false);
  const lastClickTime = useRef(0);

  const handleLogoClick = () => {
    const now = Date.now();
    if (now - lastClickTime.current < 2000) { // 2 second window for "rapid" clicks
      const newClicks = logoClicks + 1;
      setLogoClicks(newClicks);
      if (newClicks >= 7) {
        setShowConfetti(true);
        setLogoClicks(0);
        setTimeout(() => setShowConfetti(false), 10000);
      }
    } else {
      setLogoClicks(1);
    }
    lastClickTime.current = now;
  };

  const salePriceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === 2) {
      // Small timeout to ensure the element is mounted and transition is complete
      setTimeout(() => {
        salePriceInputRef.current?.focus();
      }, 300);
    }
  }, [step]);

  const [formData, setFormData] = useState({
    addressFull: '',
    unit: '',
    city: '',
    state: '',
    zip: '',
    county: '',
    placeId: '',
    lat: null,
    lng: null,
    isOhio: false,
    ownerName: '',
    parcelNumber: '',
    annualTaxes: '$0.00',
    policyType: 'homeowner',
    reissueCredit: 'no',
    priorPolicyAmount: '$0.00',
    priorSaleDate: '',
    priorPolicyFile: null as File | null,
    salePrice: '$0.00',
    salePrice2: '$0.00',
    salePrice3: '$0.00',
    closingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Default to 30 days from now
    sellerConcessions: '$0.00',
    homeWarranty: '$0.00',
    repairCredits: '$0.00',
    otherCredits: '$0.00',
    hasMortgage: 'no',
    mortgagePayoffs: [{ id: 1, lender: '', amount: '$0.00' }],
    payingCommission: 'yes',
    commissionType: 'percent',
    commissionValue: '6',
    sellerCommission: '3',
    buyerCommission: '3',
    brokerageFee: '$0.00',
    hoaMonthly: '$0.00',
    hoaTransferFee: '$0.00',
    otherCosts: [] as { id: number; label: string; amount: string }[],
    comps: [] as any[],
    showComps: 'no',
    selectedComps: [] as string[],
    avmValue: 0,
    avmLow: 0,
    avmHigh: 0
  });

  const [autoPopulatedFields, setAutoPopulatedFields] = useState<Set<string>>(new Set());
  const [expandedComps, setExpandedComps] = useState<Set<number>>(new Set());

  // Helper to format currency on blur
  const formatCurrencyInput = (value: string) => {
    const num = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (isNaN(num)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
  };

  const handleBlur = (field: string, value: string) => {
    const formatted = formatCurrencyInput(value);
    setFormData(prev => ({ ...prev, [field]: formatted }));
  };

  const handleAddressSelect = async (place: any) => {
    // ... existing manual entry logic ...
    if (place.manualAddress) {
      setFormData(prev => ({ ...prev, addressFull: place.manualAddress }));
      setError(null);
      setLookupWarning("Address entered manually. Please fill in property details below.");
      return;
    }

    // ... existing address parsing logic ...
    const components = place.addressComponents || place.address_components;
    const formattedAddress = place.formattedAddress || place.formatted_address;
    const location = place.location || (place.geometry && place.geometry.location);
    
    const addressData: any = {
      addressFull: formattedAddress,
      placeId: place.id || place.place_id,
      lat: typeof location?.lat === 'function' ? location.lat() : location?.lat,
      lng: typeof location?.lng === 'function' ? location.lng() : location?.lng,
    };

    if (components) {
      components.forEach((c: any) => {
        const types = c.types;
        const longName = c.longName || c.long_name;
        const shortName = c.shortName || c.short_name;
        
        if (types.includes('locality')) addressData.city = longName;
        if (types.includes('administrative_area_level_1')) addressData.state = shortName;
        if (types.includes('postal_code')) addressData.zip = longName;
        if (types.includes('administrative_area_level_2')) addressData.county = longName;
      });
    }

    const isOhio = addressData.state === 'OH' || addressData.state === 'Ohio';
    setFormData(prev => ({ ...prev, ...addressData, isOhio }));

    if (!isOhio && addressData.state) {
      setError("This tool is currently available for Ohio properties only. Please enter an Ohio address.");
      return;
    }

    setError(null);
    setLoading(true);
    
    if (isOhio) {
      setStep(s => s + 1);
      window.scrollTo(0, 0);
    }

    try {
      const res = await fetch('/api/net-to-seller/property-lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addressData)
      });
      const result = await res.json();
      if (result.success) {
        let formattedTaxes = '';
        if (result.data.annualTaxes) {
          formattedTaxes = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
          }).format(Number(result.data.annualTaxes));
        }

        let reissueCredit = 'no';
        let priorPolicyAmount = '0';
        let showModal = false;

        if (result.data.priorSaleDate) {
          const saleDate = new Date(result.data.priorSaleDate);
          const tenYearsAgo = new Date();
          tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
          
          if (saleDate > tenYearsAgo) {
            reissueCredit = 'yes';
            const rawPriorAmount = result.data.priorSalePrice ? result.data.priorSalePrice.toString() : '0';
            priorPolicyAmount = formatCurrencyInput(rawPriorAmount);
            showModal = true;
          }
        }

        setFormData(prev => ({
          ...prev,
          ownerName: result.data.ownerName || '',
          parcelNumber: result.data.parcelNumber || '',
          annualTaxes: formattedTaxes,
          reissueCredit,
          priorPolicyAmount,
          priorSaleDate: result.data.priorSaleDate || '',
          comps: result.data.comps || [],
          avmValue: result.data.avmValue || 0,
          avmLow: result.data.avmLow || 0,
          avmHigh: result.data.avmHigh || 0
        }));

        // Mark fields as auto-populated
        const newAutoPopulated = new Set<string>();
        if (result.data.ownerName) newAutoPopulated.add('ownerName');
        if (result.data.parcelNumber) newAutoPopulated.add('parcelNumber');
        if (result.data.annualTaxes) newAutoPopulated.add('annualTaxes');
        setAutoPopulatedFields(newAutoPopulated);
        
        if (showModal) {
          setShowReissueModal(true);
          setLookupWarning(result.warning || null);
        } else {
          setLookupWarning(result.warning || null);
        }
      } else {
        setLookupWarning("We could not auto-load county records for this address. You can still continue by entering details manually.");
      }
    } catch (err) {
      setLookupWarning("We could not auto-load county records for this address. You can still continue by entering details manually.");
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const cleanData = { ...formData };
      // Clean currency fields
      ['annualTaxes', 'salePrice', 'salePrice2', 'salePrice3', 'sellerConcessions', 'homeWarranty', 'repairCredits', 'otherCredits', 'hoaMonthly', 'hoaTransferFee'].forEach(field => {
        if (typeof (cleanData as any)[field] === 'string') {
          (cleanData as any)[field] = (cleanData as any)[field].replace(/[^0-9.]/g, '');
        }
      });
      
      // Clean array fields
      cleanData.mortgagePayoffs = cleanData.mortgagePayoffs.map(p => ({
        ...p,
        amount: p.amount.replace(/[^0-9.]/g, '')
      }));
      cleanData.otherCosts = cleanData.otherCosts.map(c => ({
        ...c,
        amount: c.amount.replace(/[^0-9.]/g, '')
      }));

      // Map priorPolicyAmount to priorSalePrice for backend compatibility
      (cleanData as any).priorSalePrice = (cleanData as any).priorPolicyAmount ? (cleanData as any).priorPolicyAmount.replace(/[^0-9.]/g, '') : '0';
      
      // Map addressFull to address for backend logging
      (cleanData as any).address = formData.addressFull;
      
      // Add file name if present (we don't upload the file itself in this version)
      if (formData.priorPolicyFile) {
        (cleanData as any).priorPolicyFileName = formData.priorPolicyFile.name;
      }

      const calcRes = await fetch('/api/net-to-seller/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanData)
      });
      const calcData = await calcRes.json();

      const createRes = await fetch('/api/net-to-seller/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...cleanData, ...calcData, inputs: cleanData })
      });
      const { id } = await createRes.json();
      navigate(`/net-to-seller/results/${id}`);
    } catch (err) {
      setError("Calculation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step === 1 && !formData.addressFull) {
      setError("Please enter a property address");
      return;
    }
    setStep(s => s + 1);
    window.scrollTo(0, 0);
  };
  const prevStep = () => setStep(s => s - 1);

  const calculateEstimatedReissue = (currentSalePrice: string, priorAmountStr: string) => {
    const salePrice = Number(currentSalePrice.replace(/[^0-9.]/g, '')) || 0;
    const priorAmount = Number(priorAmountStr.replace(/[^0-9.]/g, '')) || 0;
    if (salePrice <= 0 || priorAmount <= 0) return 0;

    const cappedPrior = Math.min(priorAmount, salePrice);
    const roundedPrior = Math.ceil(cappedPrior / 1000) * 1000;
    
    let remaining = roundedPrior;
    let basePremium = 0;
    
    // Ohio OTIRB Rate Schedule from config
    const rates = WCT_CONFIG.otirbRates;
    
    for (let i = 0; i < rates.length; i++) {
      const currentTier = rates[i];
      const nextTier = rates[i + 1];
      const tierMax = nextTier ? nextTier.threshold - currentTier.threshold : Infinity;
      
      const amountInTier = Math.min(remaining, tierMax);
      if (amountInTier <= 0) break;
      
      basePremium += (amountInTier / 1000) * currentTier.rate;
      remaining -= amountInTier;
    }

    return basePremium * 0.30;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12 flex flex-col items-center">
            <img 
              src="https://images.squarespace-cdn.com/content/v1/5f4d40b11b4f1e6a11b920b5/1598967776211-2JVFU1R4U8PQM71BWUVE/WorldClassTitle_Logos-RGB-Primary.png" 
              alt="World Class Title" 
              className="h-24 md:h-32 object-contain mb-8 cursor-pointer active:scale-95 transition-transform"
              referrerPolicy="no-referrer"
              onClick={handleLogoClick}
            />
            <h1 className="text-4xl md:text-5xl text-[#004EA8] mb-4">Net to Seller Calculator</h1>
            <p className="text-xl text-[#A2B2C8] mb-12 font-subheader">Estimate your net proceeds in under 60 seconds</p>
            <WCTButton onClick={nextStep} className="px-12 py-5 text-lg">Start estimate</WCTButton>
          </motion.div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <AddressAutocomplete label="Property Address" onAddressSelect={handleAddressSelect} error={error || undefined} />
            
            <div className="flex justify-end pt-8">
              <WCTButton onClick={nextStep} disabled={!formData.addressFull || loading}>
                Next <ChevronRight className="w-4 h-4" />
              </WCTButton>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="space-y-6 pb-6 border-b border-[#A2B2C8]/10">
              <h3 className="text-[#004EA8] text-sm font-bold flex items-center gap-2">
                Property Details
                {loading && <span className="text-xs font-normal text-[#A2B2C8] animate-pulse">(Loading records...)</span>}
              </h3>
              {lookupWarning && <WCTAlert type="warning">{lookupWarning}</WCTAlert>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WCTInput 
                  label="Owner Name" 
                  value={formData.ownerName} 
                  onChange={e => setFormData({...formData, ownerName: e.target.value})} 
                  className={autoPopulatedFields.has('ownerName') ? 'bg-slate-50' : ''}
                />
                <WCTInput 
                  label="Parcel Number" 
                  value={formData.parcelNumber} 
                  onChange={e => setFormData({...formData, parcelNumber: e.target.value})} 
                  className={autoPopulatedFields.has('parcelNumber') ? 'bg-slate-50' : ''}
                />
                <WCTInput 
                  label="Annual Taxes" 
                  value={formData.annualTaxes} 
                  onChange={e => setFormData({...formData, annualTaxes: e.target.value})} 
                  onBlur={e => handleBlur('annualTaxes', e.target.value)}
                  className={autoPopulatedFields.has('annualTaxes') ? 'bg-slate-50' : ''}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <WCTInput 
                  ref={salePriceInputRef}
                  label="Sale Price (Primary)" 
                  value={formData.salePrice} 
                  onChange={e => setFormData({...formData, salePrice: e.target.value})} 
                  onBlur={e => handleBlur('salePrice', e.target.value)}
                  required 
                  className={`${Number(formData.salePrice.replace(/[^0-9.]/g, '')) >= 100000000 ? 'animate-shake border-amber-500' : 'border-[#004EA8] bg-[#004EA8]/5 shadow-[0_0_0_4px_rgba(0,78,168,0.1)]'} transition-all`}
                />
                {Number(formData.salePrice.replace(/[^0-9.]/g, '')) >= 100000000 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-xs font-medium flex items-center gap-2"
                  >
                    <span>💸</span>
                    <span>Whoa there, Elon! For private islands and skyscrapers, please call the World Class Title executive team directly.</span>
                  </motion.div>
                )}
                {(formData.avmLow > 0 && formData.avmHigh > 0) ? (
                  <p className="text-[10px] text-emerald-600 font-bold -mt-3 pl-4 uppercase">
                    AVM ESTIMATE {(() => {
                      const formatPrice = (val: number) => {
                        if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
                        return `$${Math.round(val / 1000)}k`;
                      };
                      return `${formatPrice(formData.avmLow)} - ${formatPrice(formData.avmHigh)}`;
                    })()}
                  </p>
                ) : formData.avmValue > 0 && (
                  <p className="text-[10px] text-emerald-600 font-bold -mt-3 pl-4 uppercase">
                    AVM ESTIMATE {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(formData.avmValue)}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <WCTInput 
                    label="Option 2 (Optional)" 
                    value={formData.salePrice2} 
                    onChange={e => setFormData({...formData, salePrice2: e.target.value})} 
                    onBlur={e => handleBlur('salePrice2', e.target.value)}
                    placeholder="e.g. Low"
                  />
                  <WCTInput 
                    label="Option 3 (Optional)" 
                    value={formData.salePrice3} 
                    onChange={e => setFormData({...formData, salePrice3: e.target.value})} 
                    onBlur={e => handleBlur('salePrice3', e.target.value)}
                    placeholder="e.g. High"
                  />
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#A2B2C8] uppercase tracking-[1.5px] font-montserrat">Estimated Closing Date</label>
                <DatePicker 
                  selected={formData.closingDate} 
                  onChange={(date: Date | null) => setFormData({...formData, closingDate: date || new Date()})}
                  className="w-full px-4 py-3 rounded-xl border border-[#A2B2C8]/30 focus:outline-none focus:border-[#004EA8] bg-white text-[#004EA8]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WCTSelect 
                label="Policy Type" 
                value={formData.policyType} 
                onChange={e => setFormData({...formData, policyType: e.target.value})}
                options={[{value: 'standard', label: 'Standard Owner Policy'}, {value: 'homeowner', label: 'Homeowner Policy'}]}
                icon={formData.policyType === 'homeowner' ? Shield : undefined}
                className={formData.policyType === 'homeowner' ? '[&_svg:first-of-type]:text-emerald-500' : ''}
              />
              <div className="space-y-4">
                <WCTSelect 
                  label="Reissue Credit (Policy within 10 years?)" 
                  value={formData.reissueCredit} 
                  onChange={e => setFormData({...formData, reissueCredit: e.target.value})}
                  options={[
                    {value: 'no', label: 'No'}, 
                    {
                      value: 'yes', 
                      label: `Yes, ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
                        calculateEstimatedReissue(
                          formData.salePrice || formData.priorPolicyAmount, 
                          formData.priorPolicyAmount
                        )
                      )} Discount applied at closing.`
                    }
                  ]}
                  icon={formData.reissueCredit === 'yes' ? CheckCircle2 : undefined}
                  className={formData.reissueCredit === 'yes' ? '[&_select]:font-bold [&_svg:first-of-type]:text-emerald-500' : ''}
                />
                {formData.reissueCredit === 'no' && (
                  <p className="text-[10px] text-wct-slate font-medium pl-4 -mt-2">
                    {formData.priorSaleDate ? (
                      `Not applicable. Last closed in ${new Date(formData.priorSaleDate).getFullYear()}, outside of policy credit window.`
                    ) : (
                      "Not applicable. No prior sale record found within the credit window."
                    )}
                  </p>
                )}
                {formData.reissueCredit === 'yes' && (
                  <div className="space-y-4">
                    <WCTInput
                      label="Prior Policy Amount"
                      value={formData.priorPolicyAmount}
                      onChange={e => setFormData({...formData, priorPolicyAmount: e.target.value})}
                      onBlur={e => handleBlur('priorPolicyAmount', e.target.value)}
                      placeholder="Enter prior policy amount"
                    />
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-[#A2B2C8] uppercase tracking-[1.5px] font-montserrat">
                        Upload Prior Policy (Optional)
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            setFormData({...formData, priorPolicyFile: file});
                          }}
                          className="hidden"
                          id="prior-policy-upload"
                        />
                        <label
                          htmlFor="prior-policy-upload"
                          className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-[#A2B2C8]/30 rounded-xl cursor-pointer hover:border-[#004EA8] hover:bg-[#004EA8]/5 transition-colors group"
                        >
                          <div className="flex flex-col items-center gap-2">
                            {formData.priorPolicyFile ? (
                              <>
                                <span className="text-[#004EA8] font-medium truncate max-w-[200px]">
                                  {formData.priorPolicyFile.name}
                                </span>
                                <span className="text-xs text-[#A2B2C8]">Click to change</span>
                              </>
                            ) : (
                              <>
                                <span className="text-[#A2B2C8] group-hover:text-[#004EA8] transition-colors">
                                  Click to upload file
                                </span>
                                <span className="text-xs text-[#A2B2C8]/70">PDF, JPG, PNG up to 10MB</span>
                              </>
                            )}
                          </div>
                        </label>
                        {formData.priorPolicyFile && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              setFormData({...formData, priorPolicyFile: null});
                            }}
                            className="absolute top-2 right-2 p-1 text-red-500 hover:bg-red-50 rounded-full"
                            title="Remove file"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WCTInput 
                label="Seller Concessions" 
                value={formData.sellerConcessions} 
                onChange={e => setFormData({...formData, sellerConcessions: e.target.value})} 
                onBlur={e => handleBlur('sellerConcessions', e.target.value)}
              />
              <WCTInput 
                label="Home Warranty" 
                value={formData.homeWarranty} 
                onChange={e => setFormData({...formData, homeWarranty: e.target.value})} 
                onBlur={e => handleBlur('homeWarranty', e.target.value)}
              />
              <WCTInput 
                label="Repair Credits" 
                value={formData.repairCredits} 
                onChange={e => setFormData({...formData, repairCredits: e.target.value})} 
                onBlur={e => handleBlur('repairCredits', e.target.value)}
              />
              <WCTInput 
                label="Other Credits" 
                value={formData.otherCredits} 
                onChange={e => setFormData({...formData, otherCredits: e.target.value})} 
                onBlur={e => handleBlur('otherCredits', e.target.value)}
              />
            </div>
            <div className="flex justify-between pt-8">
              <WCTButton variant="outline" onClick={prevStep}><ChevronLeft className="w-4 h-4" /> Back</WCTButton>
              <WCTButton onClick={nextStep} disabled={!formData.salePrice}>Next <ChevronRight className="w-4 h-4" /></WCTButton>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="space-y-6 pb-6 border-b border-[#A2B2C8]/10">
              <WCTSelect 
                label="Do you have a mortgage to pay off?" 
                value={formData.hasMortgage} 
                onChange={e => setFormData({...formData, hasMortgage: e.target.value})}
                options={[{value: 'no', label: 'No'}, {value: 'yes', label: 'Yes'}]}
              />
            </div>
            {formData.hasMortgage === 'yes' && (
              <div className="space-y-4">
                {formData.mortgagePayoffs.map((p, i) => (
                  <div key={p.id} className="flex gap-4 items-end">
                    <WCTInput label="Lender Name" className="flex-1" value={p.lender} onChange={e => {
                      const newPayoffs = [...formData.mortgagePayoffs];
                      newPayoffs[i].lender = e.target.value;
                      setFormData({...formData, mortgagePayoffs: newPayoffs});
                    }} />
                    <WCTInput 
                      label="Payoff Amount" 
                      className="flex-1" 
                      value={p.amount} 
                      onChange={e => {
                        const newPayoffs = [...formData.mortgagePayoffs];
                        newPayoffs[i].amount = e.target.value;
                        setFormData({...formData, mortgagePayoffs: newPayoffs});
                      }}
                      onBlur={e => {
                        const newPayoffs = [...formData.mortgagePayoffs];
                        newPayoffs[i].amount = formatCurrencyInput(e.target.value);
                        setFormData({...formData, mortgagePayoffs: newPayoffs});
                      }}
                    />
                    {formData.mortgagePayoffs.length > 1 && (
                      <button onClick={() => setFormData({...formData, mortgagePayoffs: formData.mortgagePayoffs.filter(x => x.id !== p.id)})} className="p-3 text-red-500 hover:bg-red-50 rounded-xl mb-1">
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <WCTButton variant="outline" onClick={() => setFormData({...formData, mortgagePayoffs: [...formData.mortgagePayoffs, { id: Date.now(), lender: '', amount: '$0.00' }]})} className="w-full">
                  <Plus className="w-4 h-4" /> Add another payoff
                </WCTButton>
              </div>
            )}
            
            {formData.comps && formData.comps.length > 0 && (
              <div className="space-y-6 pt-6 border-t border-[#A2B2C8]/10">
                <WCTSelect 
                  label="Would you like to see recent comps?" 
                  value={formData.showComps} 
                  onChange={e => setFormData({...formData, showComps: e.target.value})}
                  options={[{value: 'no', label: 'No'}, {value: 'yes', label: 'Yes'}]}
                />
                
                {formData.showComps === 'yes' && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-[#1B2B4B]">Market Comps</h3>
                    <div className="space-y-3">
                      {formData.comps.map((comp, index) => (
                        <div key={index} className="border border-[#A2B2C8]/20 rounded-xl p-4 bg-white">
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              <input 
                                type="checkbox" 
                                className="mt-1 w-4 h-4 text-[#E63946] rounded border-[#A2B2C8]/30 focus:ring-[#E63946]"
                                checked={formData.selectedComps.includes(comp.address)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({...formData, selectedComps: [...formData.selectedComps, comp.address]});
                                  } else {
                                    setFormData({...formData, selectedComps: formData.selectedComps.filter(c => c !== comp.address)});
                                  }
                                }}
                              />
                              <div>
                                <p className="font-medium text-[#1B2B4B]">{comp.address}</p>
                                <div className="flex gap-4 mt-1 text-sm text-[#4A5568]">
                                  <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(comp.salePrice)}</span>
                                  <span>•</span>
                                  <span>{comp.saleDate ? new Date(comp.saleDate).toLocaleDateString() : 'Unknown Date'}</span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                const newExpanded = new Set(expandedComps);
                                if (newExpanded.has(index)) newExpanded.delete(index);
                                else newExpanded.add(index);
                                setExpandedComps(newExpanded);
                              }}
                              className="text-sm text-[#0066CC] hover:underline"
                            >
                              {expandedComps.has(index) ? 'Hide Details' : 'Details'}
                            </button>
                          </div>
                          {expandedComps.has(index) && (
                            <div className="mt-4 pt-4 border-t border-[#A2B2C8]/10 flex gap-6 text-sm text-[#4A5568]">
                              <div><span className="font-medium">Beds:</span> {comp.beds || '-'}</div>
                              <div><span className="font-medium">Baths:</span> {comp.baths || '-'}</div>
                              <div><span className="font-medium">Sqft:</span> {comp.sqft ? comp.sqft.toLocaleString() : '-'}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between pt-8">
              <WCTButton variant="outline" onClick={prevStep}><ChevronLeft className="w-4 h-4" /> Back</WCTButton>
              <WCTButton onClick={nextStep}>Next <ChevronRight className="w-4 h-4" /></WCTButton>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <WCTSelect 
              label="Are you paying real estate commission?" 
              value={formData.payingCommission} 
              onChange={e => setFormData({...formData, payingCommission: e.target.value})}
              options={[{value: 'yes', label: 'Yes'}, {value: 'no', label: 'No'}]}
            />
            {formData.payingCommission === 'yes' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <WCTSelect 
                    label="Commission Type" 
                    value={formData.commissionType} 
                    onChange={e => setFormData({...formData, commissionType: e.target.value})}
                    options={[{value: 'percent', label: 'Percent of Sale Price'}, {value: 'flat', label: 'Flat Amount'}]}
                  />
                  {formData.commissionType === 'flat' ? (
                    <WCTInput 
                      label="Total Amount ($)" 
                      value={formData.commissionValue} 
                      onChange={e => setFormData({...formData, commissionValue: e.target.value})} 
                      onBlur={e => handleBlur('commissionValue', e.target.value)}
                    />
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <WCTInput 
                        label="Seller Agent" 
                        value={formData.sellerCommission} 
                        onChange={e => setFormData({...formData, sellerCommission: e.target.value})} 
                        suffix="%"
                      />
                      <WCTInput 
                        label="Buyer Agent" 
                        value={formData.buyerCommission} 
                        onChange={e => setFormData({...formData, buyerCommission: e.target.value})} 
                        suffix="%"
                      />
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <WCTInput 
                    label="Brokerage Fee (Optional)" 
                    value={formData.brokerageFee} 
                    onChange={e => setFormData({...formData, brokerageFee: e.target.value})} 
                    onBlur={e => handleBlur('brokerageFee', e.target.value)}
                  />
                </div>

                {formData.commissionType === 'percent' && (Number(formData.sellerCommission) + Number(formData.buyerCommission)) === 0 && (
                  <motion.p 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="text-[10px] text-emerald-600 font-bold mt-1 pl-4"
                  >
                    🦄 "A 0% commission?! In this economy?! You are a saint."
                  </motion.p>
                )}
              </div>
            )}
            <div className="flex justify-between pt-8">
              <WCTButton variant="outline" onClick={prevStep}><ChevronLeft className="w-4 h-4" /> Back</WCTButton>
              <WCTButton onClick={nextStep}>Next <ChevronRight className="w-4 h-4" /></WCTButton>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WCTInput 
                label="HOA Monthly Dues" 
                value={formData.hoaMonthly} 
                onChange={e => setFormData({...formData, hoaMonthly: e.target.value})} 
                onBlur={e => handleBlur('hoaMonthly', e.target.value)}
              />
              <WCTInput 
                label="HOA Transfer Fee" 
                value={formData.hoaTransferFee} 
                onChange={e => setFormData({...formData, hoaTransferFee: e.target.value})} 
                onBlur={e => handleBlur('hoaTransferFee', e.target.value)}
              />
            </div>
            <div className="space-y-4">
              <h3 className="text-[#004EA8] text-sm font-bold">Other Seller Costs</h3>
              {formData.otherCosts.map((c, i) => (
                <div key={c.id} className="flex gap-4 items-end">
                  <WCTInput label="Label" className="flex-1" value={c.label} onChange={e => {
                    const newCosts = [...formData.otherCosts];
                    newCosts[i].label = e.target.value;
                    setFormData({...formData, otherCosts: newCosts});
                  }} />
                  <WCTInput 
                    label="Amount" 
                    className="flex-1" 
                    value={c.amount} 
                    onChange={e => {
                      const newCosts = [...formData.otherCosts];
                      newCosts[i].amount = e.target.value;
                      setFormData({...formData, otherCosts: newCosts});
                    }} 
                    onBlur={e => {
                      const newCosts = [...formData.otherCosts];
                      newCosts[i].amount = formatCurrencyInput(e.target.value);
                      setFormData({...formData, otherCosts: newCosts});
                    }}
                  />
                  <button onClick={() => setFormData({...formData, otherCosts: formData.otherCosts.filter(x => x.id !== c.id)})} className="p-3 text-red-500 hover:bg-red-50 rounded-xl mb-1">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
              <WCTButton variant="outline" onClick={() => setFormData({...formData, otherCosts: [...formData.otherCosts, { id: Date.now(), label: '', amount: '$0.00' }]})} className="w-full">
                <Plus className="w-4 h-4" /> Add other cost
              </WCTButton>
            </div>
            <div className="flex justify-between pt-8">
              <WCTButton variant="outline" onClick={prevStep}><ChevronLeft className="w-4 h-4" /> Back</WCTButton>
              <WCTButton onClick={handleCalculate} disabled={loading}>
                {loading ? 'Calculating...' : 'Calculate estimate'} <Calculator className="w-4 h-4 ml-2" />
              </WCTButton>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-wct-slate/5 py-12 px-6 flex items-center justify-center">
      {showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} gravity={0.1} />}
      <div className="max-w-2xl w-full relative">
        {/* Back Button */}
        {step > 0 && (
          <button 
            onClick={prevStep}
            className="absolute -top-12 left-0 text-wct-slate hover:text-wct-blue transition-colors p-2 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs uppercase tracking-widest font-bold">Back</span>
          </button>
        )}

        {step > 0 && <WCTStepIndicator currentStep={step} totalSteps={5} />}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            {step === 0 ? renderStep() : (
              <WCTCard className="shadow-2xl shadow-wct-blue/5">
                {renderStep()}
              </WCTCard>
            )}
          </motion.div>
        </AnimatePresence>
        
        <div className="mt-8 text-center pb-8">
          <button 
            onClick={() => setShowSmartModal(true)}
            className="text-[10px] text-wct-slate uppercase tracking-[2px] font-bold hover:text-wct-blue transition-colors"
          >
            Built by Smart, exclusively for World Class Title
          </button>
        </div>
      </div>
      <ReissueModal 
        isOpen={showReissueModal} 
        onClose={() => setShowReissueModal(false)} 
        priorAmount={formData.priorPolicyAmount}
      />
      <SmartTechModal 
        isOpen={showSmartModal} 
        onClose={() => setShowSmartModal(false)} 
      />
    </div>
  );
}
