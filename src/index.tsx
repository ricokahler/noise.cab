import 'modern-css-reset';
import './index.css';
import { createRoot } from 'react-dom/client';
import { App } from './app';
import { ErrorBoundary } from 'react-error-boundary';
import { Suspense } from 'react';

const container = document.querySelector('#container');

if (!container) {
  throw new Error('Could not find container');
}

const root = createRoot(container);
root.render(
  <div className="app">
    <div className="container">
      <ErrorBoundary fallback={<>Error</>}>
        <Suspense fallback={<>Loading…</>}>
          <App />
        </Suspense>
      </ErrorBoundary>
    </div>
  </div>,
);
