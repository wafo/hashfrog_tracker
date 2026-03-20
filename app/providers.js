'use client';

import { LayoutProvider } from '../src/context/layoutContext';
import { TrackerProvider } from '../src/context/trackerContext';

const Providers = ({ children }) => {
  return (
    <LayoutProvider>
      <TrackerProvider>
        {children}
      </TrackerProvider>
    </LayoutProvider>
  );
};

export default Providers;
