import { Suspense } from 'react';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="layout">
          <div className="main-content" style={{ marginLeft: 280 }}>
            <main className="main-body">
              <div className="loading">
                <div className="spinner" />
              </div>
            </main>
          </div>
        </div>
      }
    >
      <DashboardClient />
    </Suspense>
  );
}
