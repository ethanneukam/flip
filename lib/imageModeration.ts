// lib/imageModeration.ts
import fetch from "node-fetch";

type ModerationResult = {
  provider: string;
  score: number; // 0..1 (higher = more adult/unsafe)
  verdict: "safe" | "needs_review" | "unsafe";
  raw?: any;
};

export async function moderateImage(imageUrl: string): Promise<ModerationResult> {
  // If GOOGLE_APPLICATION_CREDENTIALS is set and @google-cloud/vision installed:
  try {
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // lazy require to avoid needing package when not used
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const vision = require("@google-cloud/vision");
      const client = new vision.ImageAnnotatorClient();

      // Google returns likelihood values: VERY_UNLIKELY, UNLIKELY, POSSIBLE, LIKELY, VERY_LIKELY
      const [result] = await client.safeSearchDetection(imageUrl);
      const detection = result.safeSearchAnnotation || {};
      // map typical adult likelihood to numeric score
      const map = (v: string) => {
        switch ((v || "").toString()) {
          case "VERY_UNLIKELY":
            return 0;
          case "UNLIKELY":
            return 0.1;
          case "POSSIBLE":
            return 0.4;
          case "LIKELY":
            return 0.75;
          case "VERY_LIKELY":
            return 0.95;
          default:
            return 0;
        }
      };

      // choose max of categories (adult, violence, racy)
      const adult = map(detection.adult);
      const racy = map(detection.racy);
      const violence = map(detection.violence);
      const score = Math.max(adult, racy, violence);

      const verdict = score >= 0.6 ? "unsafe" : score >= 0.25 ? "needs_review" : "safe";

      return { provider: "google_vision", score, verdict, raw: detection };
    }
  } catch (err) {
    console.warn("Google vision error:", err?.message || err);
    // fallback continues below
  }

  // FALLBACK: if no provider configured, conservative default -> mark needs_review
  return {
    provider: "fallback",
    score: 0.5,
    verdict: "needs_review",
    raw: { note: "No provider configured; default conservative verdict" },
  };
}
