import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { WCTButton, WCTInput, WCTSelect } from './WCTComponents';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  estimateId: string;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({ isOpen, onClose, onSuccess, estimateId }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    brokerage: '',
    email: '',
    salesRep: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const salesReps = [
    { value: 'rep1', label: 'Sarah Johnson' },
    { value: 'rep2', label: 'Michael Chen' },
    { value: 'rep3', label: 'David Smith' },
    { value: 'rep4', label: 'Jessica Williams' },
    { value: 'other', label: 'Other / Not Listed' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, estimateId })
      });

      if (!res.ok) throw new Error('Registration failed');
      
      onSuccess();
    } catch (err) {
      setError('Failed to register. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
          className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative overflow-hidden text-center"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-bold text-[#004EA8] mb-4">Coming Soon</h2>
          <p className="text-gray-500 mb-6">
            We are currently finalizing our smart platform integration. Soon you'll be able to save estimates and access exclusive features.
          </p>
          
          <WCTButton onClick={onClose} fullWidth>
            Close
          </WCTButton>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
