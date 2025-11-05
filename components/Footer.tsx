import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-black border-t border-brand-border p-4 text-center">
      <div className="max-w-7xl mx-auto">
        <p className="text-xs text-brand-subtle">
          &copy; {new Date().getFullYear()} Scalytics | Part of the Streaming Intelligence Suite
        </p>
      </div>
    </footer>
  );
};