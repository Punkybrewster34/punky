import type { Metadata } from 'next';
import { DreamHouseApp } from './DreamHouseApp';

export const metadata: Metadata = {
  title: 'DreamHaus — Design & Budget Your Dream Home',
  description:
    'Interactively design your dream house room by room, choose styles and finishes, add amenities, and get a real-time, itemized cost estimate.',
  robots: 'index, follow',
};

export default function DreamHousePage() {
  return <DreamHouseApp />;
}
