import type { Metadata } from "next";
import { VersehubReaderPage } from "@/features/versehub/pages/VersehubReaderPage";
import { getPrimarySiteUrl } from "@/lib/seo";

type PageProps = {
  params: Promise<{ lang: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { lang = "id" } = await params;
  const siteUrl = getPrimarySiteUrl();
  const path = `/versehub/${lang}`;
  const imageUrl = `/api/og/versehub/${lang}/preview`;
  const title = "VerseHub";
  const description =
    "Baca firman, simpan ayat, dan bagikan pengharapan setiap hari bersama The Chosen Talks.";

  return {
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      title: `${title} - The Chosen Talks`,
      description,
      url: `${siteUrl}${path}`,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: "VerseHub - The Chosen Talks",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} - The Chosen Talks`,
      description,
      images: [imageUrl],
    },
  };
}

export default async function Page({ params }: PageProps) {
  const { lang = "id" } = await params;

  return <VersehubReaderPage lang={lang} mode="landing" />;
}
