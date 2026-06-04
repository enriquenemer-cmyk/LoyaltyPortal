import { Suspense } from 'react';
import ScannerClient from './ScannerClient';

export default function EscanearPage() {
  return (
    <Suspense>
      <ScannerClient />
    </Suspense>
  );
}
