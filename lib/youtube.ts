import { parse } from "node-html-parser";

// Add minimal interfaces for script and document
interface ScriptWithTextContent {
  textContent: string;
}
interface ScriptCollection {
  length: number;
  [index: number]: unknown;
}
interface DocumentWithGetElementsByTagName {
  getElementsByTagName: (tag: string) => ScriptCollection;
}

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.83 Safari/537.36,gzip(gfe)";

class YoutubeTranscriptError extends Error {
  constructor(message: string) {
    super(`[YoutubeTranscript] ${message}`);
  }
}

type YtFetchConfig = {
  lang?: string; // Object with lang param (eg: en, es, hk, uk) format.
};

async function fetchTranscript(videoId: string, config: YtFetchConfig = {}) {
  console.log("fetchTranscript", videoId);
  const identifier = extractYouTubeID(videoId);
  const lang = config?.lang ?? "en";
  try {
    const videoPageUrl = `https://www.youtube.com/watch?v=${identifier}`;
    console.log(`[youtube.ts] Attempting to fetch video page: ${videoPageUrl}`); // Log URL
    const transcriptUrl = await fetch(
      videoPageUrl,
      {
        headers: {
          "User-Agent": USER_AGENT,
        },
      }
    )
      .then((res) => {
        console.error("res.text()", res.text());
        if (!res.ok) {
          // Log error details before throwing for failed page fetch
          console.error(`[youtube.ts] Failed to fetch video page ${videoPageUrl}. Status: ${res.status} ${res.statusText}`);
          throw new Error(`Failed to fetch video page ${videoPageUrl}: ${res.status} ${res.statusText}`);
        }
        return res.text();
      })
      .then((html) => parse(html))
      .then((html) => parseTranscriptEndpoint(html, lang))
      .catch(err => console.error("err", err));

    if (!transcriptUrl) {
      console.error(`[youtube.ts] Failed to locate a transcript URL for video ID ${identifier} with lang ${lang}.`);
      throw new Error("Failed to locate a transcript for this video!");
    }

    console.log(`[youtube.ts] Attempting to fetch transcript XML from: ${transcriptUrl}`); // Log URL
    const transcriptXML = await fetch(transcriptUrl)
      .then((res) => {
        if (!res.ok) {
          // Log error details before throwing for failed XML fetch
          console.error(`[youtube.ts] Failed to fetch transcript XML from ${transcriptUrl}. Status: ${res.status} ${res.statusText}`);
          throw new Error(`Failed to fetch transcript XML from ${transcriptUrl}: ${res.status} ${res.statusText}`);
        }
        return res.text();
      })
      .then((xml) => parse(xml))

    const chunks = transcriptXML?.getElementsByTagName("text");

    const transcriptions = [];
    for (const chunk of chunks) {
      const attrs: Record<string, number> = {};
      chunk.rawAttrs.split(" ").forEach(attr => {
        const [key, value] = attr.split("=");
        if (key && value) {
          attrs[key] = parseFloat(value.replace(/"/g, ""));
        }
      });

      // Decode common HTML entities from chunk.text
      let cleanText = chunk.text;
      cleanText = cleanText.replace(/&#39;/g, "'")
                           .replace(/&apos;/g, "'") // &apos; is also used for apostrophe
                           .replace(/&amp;/g, "&")
                           .replace(/&quot;/g, "\"")
                           .replace(/&lt;/g, "<")
                           .replace(/&gt;/g, ">");

      transcriptions.push({
        text: cleanText, // Use the cleaned text
        offset: Math.round((attrs["start"] ?? 0) * 1000),    // ms
        duration: Math.round((attrs["dur"] ?? 0) * 1000),    // ms
      });
    }
    return transcriptions;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    throw new YoutubeTranscriptError(message);
  }
}

function parseTranscriptEndpoint(document: unknown, langCode?: string) {
  try {
    // Get all script tags on document page
    if (
      !document ||
      typeof document !== "object" ||
      typeof (document as DocumentWithGetElementsByTagName).getElementsByTagName !== "function"
    ) {
      return null;
    }
    const scripts = (document as DocumentWithGetElementsByTagName).getElementsByTagName("script");
    const playerScript = Array.from(scripts).find((script): script is ScriptWithTextContent => {
      return (
        typeof script === "object" &&
        script !== null &&
        "textContent" in script &&
        typeof (script as ScriptWithTextContent).textContent === "string" &&
        (script as ScriptWithTextContent).textContent.includes("var ytInitialPlayerResponse = {")
      );
    });
    if (!playerScript || typeof playerScript.textContent !== "string") {
      return null;
    }
    const dataString =
      playerScript.textContent
        ?.split("var ytInitialPlayerResponse = ")?.[1]
        ?.split("};")?.[0] +
      "}";
    const data = JSON.parse(dataString.trim());
    const availableCaptions =
      data?.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    let captionTrack = availableCaptions?.[0];
    if (langCode)
      captionTrack =
        availableCaptions.find(
          (track: { languageCode?: string }) =>
            typeof track.languageCode === "string" && track.languageCode.includes(langCode)
        ) ?? availableCaptions?.[0];
    return captionTrack?.baseUrl;
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`parseTranscriptEndpoint Error: ${message}`);
    return null;
  }
}

export function extractYouTubeID(urlOrID: string): string | null {
  // Regular expression for YouTube ID format
  const regExpID = /^[a-zA-Z0-9_-]{11}$/;

  // Check if the input is a YouTube ID
  if (regExpID.test(urlOrID)) {
    return urlOrID;
  }

  // Regular expression for standard YouTube links
  const regExpStandard = /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/;

  // Regular expression for YouTube Shorts links
  const regExpShorts = /youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/;

  // Check for standard YouTube link
  const matchStandard = urlOrID.match(regExpStandard);

  if (matchStandard) {
    return matchStandard[1];
  }

  // Check for YouTube Shorts link
  const matchShorts = urlOrID.match(regExpShorts);
  if (matchShorts) {
    return matchShorts[1];
  }

  // Return null if no match is found
  return null;
}

export { fetchTranscript, YoutubeTranscriptError };