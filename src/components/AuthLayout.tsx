import type { ReactNode } from 'react'
import BrandMark from '@/components/BrandMark'
import sunset from '@/assets/brand/login-sunset.webp'

// Shared frame for sign-in and password screens: the property at sunset on
// wide screens, the form on a cream panel everywhere.
export default function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--brand-cream)] text-[var(--brand-text)]">
      <aside className="relative hidden w-1/2 overflow-hidden lg:block">
        <img src={sunset} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--brand-charcoal)]/85 via-[var(--brand-charcoal)]/25 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-12 text-[var(--brand-cream)]">
          <p className="heading-serif text-4xl leading-tight">Rustic Retreat</p>
          <p className="mt-2 max-w-sm text-sm text-[var(--brand-cream)]/80">65 private acres of forest and meadow near Lac La Nonne, Alberta. One wedding per weekend.</p>
        </div>
      </aside>

      <main className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center">
            <BrandMark className="h-12 text-[var(--brand-charcoal)]" />
            <p className="mt-3 text-xs font-medium uppercase tracking-[0.2em] text-[var(--brand-text)]/60">Rustic Retreat</p>
            <h1 className="heading-serif mt-6 text-3xl text-[var(--brand-charcoal)]">{title}</h1>
            <p className="mt-2 text-sm text-[var(--brand-text)]/70">{subtitle}</p>
          </div>
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}

export const authField = 'w-full rounded-lg border border-[var(--brand-accent)] bg-white px-3 py-2.5 text-sm text-[var(--brand-charcoal)] placeholder:text-[var(--brand-charcoal)]/40 focus:border-[var(--brand-terracotta)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-terracotta)]/20'
export const authLabel = 'block text-sm font-medium text-[var(--brand-charcoal)]'
export const authPrimary = 'flex w-full items-center justify-center rounded-lg bg-[var(--brand-terracotta)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-terracotta)] disabled:cursor-not-allowed disabled:opacity-60'
export const authLink = 'text-sm font-medium text-[var(--brand-terracotta)] underline-offset-4 hover:underline'
