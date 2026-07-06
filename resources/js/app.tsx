import './index.css';
import './styles/component-preview.css';
import './styles/simulation.css';
import './styles/components.css';
import './App.css';

import React from 'react';
import { createInertiaApp } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';
import AppProviders from '@/layouts/AppProviders';

const appName = import.meta.env.VITE_APP_NAME || 'DeepCircuits';

createInertiaApp({
  title: (title) => (title ? `${title} - ${appName}` : appName),
  resolve: async (name) => {
    const page = await resolvePageComponent(
      `./Pages/${name}.tsx`,
      import.meta.glob('./Pages/**/*.tsx'),
    );
    const component = (page as { default: React.ComponentType & { layout?: unknown } }).default;
    component.layout ??= (pageContent: React.ReactNode) => <AppProviders>{pageContent}</AppProviders>;
    return page;
  },
  setup({ el, App, props }) {
    createRoot(el).render(<App {...props} />);
  },
  progress: {
    color: '#9b87f5',
  },
});
