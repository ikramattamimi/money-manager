import type { VariantProps } from 'class-variance-authority';
import { cva } from 'class-variance-authority';

export { default as Button } from './Button.vue';

// Varian mengikuti Opnamix (src/components/ui/button.tsx), plus ukuran `touch`
// 44px untuk aksi utama di HP. Tekan: scale(0.97), lihat effects.css.
export const buttonVariants = cva(
  'press inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border border-transparent font-semibold outline-none transition-[transform,background-color,border-color] duration-150 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-white hover:bg-destructive/90',
        outline:
          'border-input bg-card text-foreground hover:border-primary-accent/50 hover:bg-surface-2',
        secondary: 'border-border bg-surface-2 text-foreground hover:border-input',
        soft: 'bg-primary-soft text-primary-ink hover:border-primary-accent/30',
        ghost: 'text-muted-foreground hover:bg-surface-2 hover:text-foreground',
        'ghost-danger': 'text-bad hover:bg-bad-soft',
        link: 'text-primary-ink underline-offset-4 hover:underline',
        // Di atas gradien kepala halaman/sidebar
        light: 'bg-on-grad text-grad-ink hover:bg-primary-soft',
        glass:
          'border-glass-line bg-glass text-on-grad hover:bg-glass-2 aria-pressed:border-on-grad aria-pressed:bg-on-grad aria-pressed:text-grad-ink',
      },
      // sm 28px, default 32px, lg 38px, touch 44px
      size: {
        default: 'h-8 px-3 text-meta',
        sm: 'h-7 px-2.5 text-xs [&_svg:not([class*=size-])]:size-3.5',
        lg: 'h-9.5 px-4 text-sm',
        touch: 'h-11 rounded-[10px] px-4 text-sm',
        icon: 'size-8',
        'icon-sm': 'size-7 [&_svg:not([class*=size-])]:size-3.5',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);
export type ButtonVariants = VariantProps<typeof buttonVariants>;
