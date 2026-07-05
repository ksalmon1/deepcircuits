import React from 'react';
import { Link as InertiaLink, router } from '@inertiajs/react';

/**
 * Small compatibility layer over Inertia for components written against
 * react-router-dom. Supports the subset of the API this app uses.
 */

type LinkProps = Omit<React.ComponentProps<typeof InertiaLink>, 'href'> & {
  to: string;
};

export const Link = ({ to, ...props }: LinkProps) => <InertiaLink href={to} {...props} />;

export const useNavigate = () => {
  return (to: string | number) => {
    if (typeof to === 'number') {
      window.history.go(to);
      return;
    }
    router.visit(to);
  };
};

export const useLocation = () => {
  return { pathname: typeof window !== 'undefined' ? window.location.pathname : '/' };
};

/** Imperative redirect used as a render guard in a few pages. */
export const Navigate = ({ to }: { to: string; replace?: boolean }) => {
  React.useEffect(() => {
    router.visit(to, { replace: true });
  }, [to]);
  return null;
};

/**
 * Inertia-backed navigation blocker with a react-router-like interface.
 * Blocks Inertia GET visits while shouldBlock() returns true and exposes
 * proceed()/reset() for confirm dialogs; hard reloads get the native
 * beforeunload prompt.
 */
export const useBlocker = (shouldBlock: () => boolean) => {
  const [state, setState] = React.useState<'unblocked' | 'blocked'>('unblocked');
  const pendingUrl = React.useRef<string | null>(null);
  const bypass = React.useRef(false);
  const shouldBlockRef = React.useRef(shouldBlock);
  shouldBlockRef.current = shouldBlock;

  React.useEffect(() => {
    return router.on('before', (event) => {
      const visit = event.detail.visit;
      if (bypass.current || visit.method !== 'get') return;
      if (shouldBlockRef.current()) {
        pendingUrl.current = visit.url.href;
        setState('blocked');
        event.preventDefault();
      }
    });
  }, []);

  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (shouldBlockRef.current()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  return {
    state,
    proceed: () => {
      const url = pendingUrl.current;
      pendingUrl.current = null;
      setState('unblocked');
      if (url) {
        bypass.current = true;
        router.visit(url, { onFinish: () => { bypass.current = false; } });
      }
    },
    reset: () => {
      pendingUrl.current = null;
      setState('unblocked');
    },
  };
};
