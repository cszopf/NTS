import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, User, Phone, Building, ArrowRight } from 'lucide-react';
import { WCTButton, WCTInput } from './WCTComponents';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [loading, setLoading] = useState(false);
  
  // Mock form state
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    brokerage: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 1500);
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
          className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden flex flex-col max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-bold text-[#004EA8]">
              {mode === 'signin' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100">
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                mode === 'signin' ? 'text-[#004EA8]' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setMode('signin')}
            >
              Sign In
              {mode === 'signin' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#004EA8]" />
              )}
            </button>
            <button
              className={`flex-1 py-3 text-sm font-medium transition-colors relative ${
                mode === 'signup' ? 'text-[#004EA8]' : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setMode('signup')}
            >
              Create Account
              {mode === 'signup' && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#004EA8]" />
              )}
            </button>
          </div>

          {/* Form */}
          <div className="p-6 overflow-y-auto">
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <WCTInput
                    label="Full Name"
                    icon={User}
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    required
                  />
                  <WCTInput
                    label="Phone Number"
                    icon={Phone}
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    required
                  />
                  <WCTInput
                    label="Brokerage"
                    icon={Building}
                    value={formData.brokerage}
                    onChange={e => setFormData({...formData, brokerage: e.target.value})}
                    required
                  />
                </>
              )}
              
              <WCTInput
                label="Email Address"
                icon={Mail}
                type="email"
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                required
              />
              
              <WCTInput
                label="Password"
                icon={Lock}
                type="password"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                required
              />

              <div className="pt-4">
                <WCTButton type="submit" fullWidth disabled={loading}>
                  {loading ? (
                    'Processing...'
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      {mode === 'signin' ? 'Sign In' : 'Create Account'} 
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </WCTButton>
              </div>
              
              <p className="text-xs text-center text-gray-400 mt-4">
                By continuing, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
