import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Send, Sparkles, X, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GeminiAssistantProps {
  estimate: any;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({ estimate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // @ts-ignore - process.env is injected by the platform
      let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
      if (apiKey) {
        apiKey = apiKey.replace(/^["']|["']$/g, '');
      }
      if (!apiKey) {
        throw new Error("API Key not found");
      }
      
      const ai = new GoogleGenAI({ apiKey });
      
      // Parse breakdown from calcJson if available
      let closingCostsBreakdown = [];
      try {
        if (estimate.calcJson) {
          const parsed = JSON.parse(estimate.calcJson);
          // Handle both structure formats (direct or nested in breakdown)
          closingCostsBreakdown = parsed.breakdown?.closingCostsBreakdown || parsed.closingCostsBreakdown || [];
        }
      } catch (e) {
        console.error("Error parsing calcJson", e);
      }

      // Construct context from estimate
      const context = `
        You are a helpful assistant for World Class Title, answering questions about a Net to Seller Estimate.
        Here are the details of the estimate:
        Address: ${estimate.addressFull}
        Sale Price: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.salePrice)}
        Estimated Net Proceeds: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedNetProceeds)}
        
        Breakdown:
        - Commission: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.commissionAmount)}
        - Mortgage Payoffs: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.mortgagePayoffsTotal)}
        - Seller Credits: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.sellerCreditsTotal)}
        - Home Warranty: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.homeWarranty || 0)}
        - Closing Costs: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedClosingCostsTotal)}
        - Title Premium: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedTitlePremium)}
        - Transfer Tax: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedTransferTax)}
        - Tax Proration: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(estimate.estimatedTaxProration)}
        
        Closing Costs Breakdown:
        ${closingCostsBreakdown.map((item: any) => `- ${item.label}: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.value)}`).join('\n') || 'N/A'}

        Please answer the user's question based on this information. Be professional, concise, and helpful.
        If the user asks about fees not listed, explain that these are estimates and final figures may vary.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: context + "\n\nUser Question: " + userMessage }] }
        ],
      });

      const text = response.text;
      setMessages(prev => [...prev, { role: 'model', text: text || "I'm sorry, I couldn't generate a response." }]);
    } catch (error) {
      console.error("Error calling Gemini:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="fixed bottom-6 right-6 bg-[#004EA8] text-white p-4 rounded-full shadow-lg hover:bg-[#003d82] transition-colors z-50 flex items-center gap-2"
          onClick={() => setIsOpen(true)}
        >
          <Sparkles className="w-6 h-6" />
          <span className="font-medium pr-2">Ask AI Assistant</span>
        </motion.button>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-[#A2B2C8]/20 z-50 flex flex-col overflow-hidden"
            style={{ height: '500px' }}
          >
            {/* Header */}
            <div className="bg-[#004EA8] p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold">Estimate Assistant</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-1 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.length === 0 && (
                <div className="text-center text-gray-500 mt-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Ask me anything about this estimate!</p>
                  <p className="text-xs mt-2">Example: "Explain the title premium"</p>
                </div>
              )}
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div 
                    className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-[#004EA8] text-white rounded-br-none' 
                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-none shadow-sm'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white border border-gray-200 p-3 rounded-2xl rounded-bl-none shadow-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Type your question..."
                  className="flex-1 px-4 py-2 rounded-full border border-gray-300 focus:outline-none focus:border-[#004EA8] focus:ring-1 focus:ring-[#004EA8]"
                  disabled={loading}
                />
                <button
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  className="bg-[#004EA8] text-white p-2 rounded-full hover:bg-[#003d82] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
