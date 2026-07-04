/**
 * Always open external URLs via window.open with safety attrs
 * to bypass sandbox/iframe blocking on api.whatsapp.com etc.
 */
export function openExternal(url?: string | null) {
  if (!url) return;
  try {
    window.open(url, "_blank", "noopener,noreferrer");
  } catch {
    /* noop — preview sandbox edge */
  }
}

export const FALLBACK_LINKS = {
  whatsapp: "https://api.whatsapp.com/send/?phone=201020658409&text&type=phone_number&app_absent=0",
  facebook: "https://www.facebook.com/share/1DufbAtv6R/",
  linkedin:
    "https://www.linkedin.com/posts/mdink-for-digital-solutions_mdink-digitalabrsolutions-activity-7451243778880860161-KuYH",
  instagram: "https://www.instagram.com/mdink.solutions",
  reels: [
    "https://www.instagram.com/reel/DNyFBP1WNB9/",
    "https://www.instagram.com/reel/DNqZxjqMybo/",
  ],
  sites: {
    allam: "https://allamheartcare.com",
    howa: "https://howaclinic.com",
    seniors: "https://seniors-clinic.com/en/home/",
  },
};
