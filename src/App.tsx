import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import NetToSeller from './pages/NetToSeller';
import Results from './pages/Results';

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-white selection:bg-[#64CCC9]/30">
        <Routes>
          <Route path="/" element={<Navigate to="/net-to-seller" replace />} />
          <Route path="/net-to-seller" element={<NetToSeller />} />
          <Route path="/net-to-seller/results/:estimateId" element={<Results />} />
        </Routes>
      </div>
    </Router>
  );
}
