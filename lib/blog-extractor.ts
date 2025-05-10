"use server"

import { load } from "cheerio"

export async function extractContent(url: string) {
  try {
    // Improved headers to mimic a real browser
    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      Referer: "https://www.google.com/",
      DNT: "1",
      Connection: "keep-alive",
      "Upgrade-Insecure-Requests": "1",
      "Cache-Control": "max-age=0",
    }

    // Fetch the HTML content
    const response = await fetch(url, { headers })

    if (!response.ok) {
      console.error(`Failed to fetch content: ${response.status} ${response.statusText}`)
      return {
        title: null,
        content: null,
        error: `Failed to fetch content: ${response.status} ${response.statusText}`,
      }
    }

    const html = await response.text()

    // Use cheerio to parse the HTML
    const $ = load(html)

    // Extract the title
    const title = $("title").text().trim() || $("h1").first().text().trim()

    // Remove unwanted elements
    $("script, style, nav, footer, header, aside, .ads, .comments, .sidebar").remove()

    // Extract the main content
    // This is a simplified approach - real-world extraction would be more complex
    let content = ""

    // Try to find the main content container
    const mainContent = $("article, .article, .post, .content, main, #content, #main")

    if (mainContent.length > 0) {
      // If we found a main content container, use that
      content = mainContent.text()
    } else {
      // Otherwise, try to extract paragraphs
      $("p").each((_, element) => {
        const text = $(element).text().trim()
        if (text.length > 50) {
          // Only include paragraphs with substantial content
          content += text + "\n\n"
        }
      })
    }

    // Clean up the content
    content = content
      .replace(/\s+/g, " ")
      .replace(/\n\s*\n/g, "\n\n")
      .trim()

    if (!content || content.length < 100) {
      return {
        title,
        content: null,
        error: "Could not extract sufficient content from the blog",
      }
    }

    return { title, content, error: null }
  } catch (error) {
    console.error("Error extracting blog content:", error)
    return {
      title: null,
      content: null,
      error: error instanceof Error ? error.message : "Failed to extract blog content",
    }
  }
}
