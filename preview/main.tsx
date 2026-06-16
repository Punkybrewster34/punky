import React from 'react';
import { createRoot } from 'react-dom/client';
import { DreamHouseApp } from '../app/dream-house/DreamHouseApp';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DreamHouseApp />
  </React.StrictMode>,
);
