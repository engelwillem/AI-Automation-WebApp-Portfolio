import { redirect } from "next/navigation";

const communityBaseUrl =
  process.env.NEXT_PUBLIC_TCT_COMMUNITY_URL?.trim() || "https://community.thechoosentalks.org";

export default function VerseHubRedirectPage() {
  redirect(`${communityBaseUrl}/versehub/id`);
}
