import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { WCTButton } from './WCTComponents';

interface SmartTechModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartTechModal: React.FC<SmartTechModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 relative overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-bold text-[#004EA8] mb-4">Often imitated, never duplicated</h2>
          
          <div className="space-y-4 text-gray-600 leading-relaxed">
            <p>
              Smart builds technology exclusively for <a href="https://smarttitleventures.com" target="_blank" rel="noreferrer" className="text-[#004EA8] font-semibold hover:underline">Smart Title Ventures</a> and <a href="https://worldclasstitle.com" target="_blank" rel="noreferrer" className="text-[#004EA8] font-semibold hover:underline">World Class Title</a>.
            </p>
            
            <p>
              If you're an agent who would like support with marketing and title on your next transaction, <a href="mailto:info@worldclasstitle.com?subject=Inbound NTS Marketing Request" className="text-[#004EA8] font-semibold hover:underline">reach out to our team</a>.
            </p>
            
            <p className="font-medium text-gray-800">
              We don't sell our technology to other title companies.
            </p>
          </div>
          
          <div className="mt-8">
            <WCTButton onClick={onClose} fullWidth>
              Close
            </WCTButton>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
