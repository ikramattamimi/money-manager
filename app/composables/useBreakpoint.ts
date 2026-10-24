/**
 * Tiga tata letak (sama dengan --breakpoint-* di tokens.css):
 * HP < 768px, iPad 768–1179px (landscape >= 1024px), desktop >= 1180px.
 */
export const BREAKPOINTS = { md: 768, lg: 1024, xl: 1180 } as const;

export function useBreakpoint() {
  const md = useState('bp:md', () => false);
  const lg = useState('bp:lg', () => false);
  const xl = useState('bp:xl', () => false);
  const ready = useState('bp:ready', () => false);

  if (import.meta.client && !ready.value) {
    ready.value = true;
    for (const [key, px] of Object.entries(BREAKPOINTS)) {
      const mq = matchMedia(`(min-width: ${px}px)`);
      const target = { md, lg, xl }[key as keyof typeof BREAKPOINTS];
      target.value = mq.matches;
      mq.addEventListener('change', (e) => (target.value = e.matches));
    }
  }

  return { md, lg, xl };
}
