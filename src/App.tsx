import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NetToSeller from './pages/NetToSeller';
import Results from './pages/Results';

export default function App() {
  const [isRetroMode, setIsRetroMode] = useState(false);
  const [keystrokes, setKeystrokes] = useState<string[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      
      setKeystrokes(prev => {
        const newKeystrokes = [...prev, key].slice(-10);
        
        const sequence = newKeystrokes.map(k => {
          if (k === 'Up' || k === 'ArrowUp') return 'U';
          if (k === 'Down' || k === 'ArrowDown') return 'D';
          if (k === 'Left' || k === 'ArrowLeft') return 'L';
          if (k === 'Right' || k === 'ArrowRight') return 'R';
          if (k.toLowerCase() === 'b') return 'B';
          if (k.toLowerCase() === 'a') return 'A';
          return k;
        }).join('');

        if (sequence === 'UUDDLRLRBA') {
          setIsRetroMode(prevMode => !prevMode);
          return [];
        }
        return newKeystrokes;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isRetroMode) {
      document.body.classList.add('retro-theme');
    } else {
      document.body.classList.remove('retro-theme');
    }
  }, [isRetroMode]);

  return (
    <Router>
      <div className={`min-h-screen bg-white selection:bg-[#64CCC9]/30 ${isRetroMode ? 'retro-mode' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="/net-to-seller" replace />} />
          <Route path="/net-to-seller" element={<NetToSeller />} />
          <Route path="/net-to-seller/results/:estimateId" element={<Results />} />
        </Routes>
      </div>
    </Router>
  );
}
