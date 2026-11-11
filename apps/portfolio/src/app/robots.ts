import type { MetadataRoute } from "next";
import { ORIGIN } from "@/src/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/" },
      { userAgent: ["GPTBot", "ChatGPT-User", "ClaudeBot", "Google-Extended"], allow: "/" },
    ],
    sitemap: `${ORIGIN}/sitemap.xml`,
  };
}
