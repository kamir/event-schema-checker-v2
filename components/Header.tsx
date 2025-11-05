import React from 'react';
import { ScalyticsLogo } from './icons/ScalyticsLogo';

export const Header: React.FC = () => {
  return (
    <header className="relative bg-black border-b border-brand-border p-4 overflow-hidden">
      {/* GLOW EFFECT */}
      <div 
        className="absolute top-0 left-1/2 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 pointer-events-none"
        aria-hidden="true"
      ></div>

      <div className="relative max-w-7xl mx-auto flex items-center space-x-4">
        <ScalyticsLogo className="h-8 w-auto" />
        <span className="text-xl font-semibold text-brand-text tracking-wide">
          Streaming Event Schema Checker
        </span>
      </div>
    </header>
  );
};