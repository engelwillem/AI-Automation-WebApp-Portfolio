import type { Metadata } from "next";
import type { ReactNode } from "react";
import { getPrimarySiteUrl } from "@/lib/seo";

const path = "/community";
const imageUrl = "/api/og/community/preview";
const title = "Community";
const description = "Bagikan cerita, doa, dan refleksi iman bersama komunitas The Chosen Talks.";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: path,
  },
  openGraph: {
    title: `${title} - The Chosen Talks`,
    description,
    url: `${getPrimarySiteUrl()}${path}`,
    images: [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: "Community - The Chosen Talks",
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

export default function CommunityLayout({ children }: { children: ReactNode }) {
  return children;
}
