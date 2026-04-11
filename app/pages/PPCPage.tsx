import React from 'react';
import { ManagerEditorLayout } from '../ui';

const PPCPage: React.FC = () => {
  return (
    <ManagerEditorLayout title="Product Pricing Calculator">
      <p className="mb-8 text-[var(--color-text-secondary)]">
        This is an embedded calculator. Data is sourced from publicly published Google Sheets (CSV).
      </p>
      <iframe
        src="ppc_calculator.html"
        title="Product Pricing Calculator"
        className="w-full h-[calc(100vh-250px)] border-none rounded-[var(--radius-component)]"
        style={{ boxShadow: 'var(--shadow-elevation)' }}
        aria-label="Product Pricing Calculator embedded from HTML file"
      ></iframe>
    </ManagerEditorLayout>
  );
};

export default PPCPage;