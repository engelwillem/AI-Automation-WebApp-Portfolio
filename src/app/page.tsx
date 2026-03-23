import Link from 'next/link';
import type { Metadata } from 'next';
import { TCTLogo } from '@/components/brand/TCTLogo';

export const metadata: Metadata = {
  title: 'Renungan Harian Kristen untuk Menerima Firman dan Berdoa',
  description: 'The Chosen Talks membantu Anda menerima firman, merenungkan ayat harian, dan bertumbuh bersama komunitas iman setiap hari.',
  alternates: {
    canonical: '/',
  },
};

export default function HomePage() {
  return (
    <div className="relative min-h-screen bg-[#FAFCFF] flex flex-col items-center justify-center px-6 font-sans selection:bg-black/10">
      
      {/* Subtle texture */}
      <div className="pointer-events-none fixed inset-0 bg-[url('/grain.png')] opacity-[0.03] mix-blend-multiply" aria-hidden="true" />

      {/* Centered content — one viewport, no scroll */}
      <main className="relative z-10 flex flex-col items-center text-center w-full max-w-[340px]">
        
        {/* Brand — SVG logo + quiet text */}
        <div className="flex flex-col items-center mb-10 pt-4">
          <TCTLogo className="w-12 h-12 mb-5 drop-shadow-sm opacity-95" />
          <p className="text-[10px] font-bold tracking-[0.22em] uppercase text-foreground/35">
            The Chosen Talks
          </p>
        </div>

        {/* Headline — one thought, not a pitch */}
        <h1 className="tct-serif text-[38px] leading-[1.15] tracking-tight text-foreground/90 mb-4">
          Renungan harian Kristen<br />untuk memulai hari ini.
        </h1>

        <p className="text-[15px] leading-[1.65] text-foreground/55 mb-12 font-medium">
          Terima firman, renungkan ayat harian,<br />dan berdoa bersama komunitas iman.
        </p>

        {/* Primary CTA */}
        <Link
          href="/today"
          className="w-full max-w-[280px] rounded-full bg-foreground text-background py-[14px] text-[15px] font-semibold tracking-wide transition-all active:scale-[0.97] hover:opacity-90"
        >
          Lanjut sebagai Guest
        </Link>

        {/* Secondary — very quiet auth */}
        <div className="mt-8 flex items-center gap-4 text-[12px] text-foreground/40 font-medium">
          <Link href="/login?intent=signup" className="hover:text-foreground/70 transition-colors">Daftar</Link>
          <span aria-hidden="true" className="opacity-30">·</span>
          <Link href="/login" className="hover:text-foreground/70 transition-colors">Login</Link>
        </div>

        <nav aria-label="Link utama" className="mt-10 w-full max-w-[320px]">
          <ul className="grid gap-3 text-left text-[13px]">
            <li>
              <Link href="/today" className="block rounded-2xl border border-black/[0.06] bg-white/80 px-4 py-3 text-foreground/75 transition-colors hover:text-foreground">
                Renungan harian dan doa di Today
              </Link>
            </li>
            <li>
              <Link href="/versehub/id" className="block rounded-2xl border border-black/[0.06] bg-white/80 px-4 py-3 text-foreground/75 transition-colors hover:text-foreground">
                Baca dan renungkan ayat Alkitab di VerseHub
              </Link>
            </li>
            <li>
              <Link href="/community" className="block rounded-2xl border border-black/[0.06] bg-white/80 px-4 py-3 text-foreground/75 transition-colors hover:text-foreground">
                Bergabung dengan komunitas iman di Community
              </Link>
            </li>
          </ul>
        </nav>

      </main>
    </div>
  );
}
