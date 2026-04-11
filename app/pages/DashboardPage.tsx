import React from 'react';
import { DashboardLayout } from '../ui'; // Import the new DashboardLayout

const DashboardPage: React.FC = () => {
  // This page now acts as a thin wrapper for the DashboardLayout
  // The layout itself manages its content and sidebar state.
  return <DashboardLayout />;
};

export default DashboardPage;