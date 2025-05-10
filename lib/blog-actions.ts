"use server"

import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"
import { extractContent } from "@/lib/blog-extractor"

export async function analyzeBlog(url: string, manualContent?: string) {
  try {
    // Validate URL if not using manual content
    if (!manualContent && !isValidUrl(url)) {
      throw new Error("Invalid URL format")
    }

    let title = "Blog Article"
    let content = manualContent

    // If no manual content is provided, try to extract from URL
    if (!manualContent) {
      const extraction = await extractContent(url)

      if (extraction.error) {
        // Return the error to be handled by the client
        return {
          error: extraction.error,
          needsManualContent: true,
        }
      }

      title = extraction.title || "Blog Article"
      content = extraction.content ?? undefined
    }

    if (!content || content.length < 100) {
      throw new Error("Content is too short for meaningful analysis")
    }

    // Truncate content if it's too long to avoid token limits
    const truncatedContent = content.substring(0, 15000)

    // Generate analysis using AI
    const analysis = await generateBlogAnalysis(truncatedContent, title)

    return {
      title,
      url,
      ...analysis,
      error: null,
      needsManualContent: false,
    }
  } catch (error) {
    console.error("Error analyzing blog:", error)
    return {
      error: error instanceof Error ? error.message : "Failed to analyze blog",
      needsManualContent: false,
    }
  }
}

async function generateBlogAnalysis(content: string, title: string) {
  try {
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is missing")
    }

    const prompt = `
      You are an expert content analyzer. Based on the following blog article titled "${title}", please provide:
      
      1. A concise summary (max 150 words)
      2. 5-7 key points from the article
      3. 3-5 notable quotes from the article
      4. 3-5 practical lessons or takeaways from the article
      
      Blog content: ${content}
      
      Format your response as JSON with the following structure:
      {
        "summary": "...",
        "keyPoints": ["point 1", "point 2", ...],
        "quotes": ["quote 1", "quote 2", ...],
        "lessons": ["lesson 1", "lesson 2", ...]
      }
    `

    const { text } = await generateText({
      model: openai("gpt-3.5-turbo"),
      prompt,
    })

    try {
      return JSON.parse(text)
    } catch (error) {
      console.error("Error parsing AI response:", error)
      return {
        summary: "Failed to generate summary.",
        keyPoints: ["Failed to extract key points."],
        quotes: ["Failed to extract quotes."],
        lessons: ["Failed to extract lessons."],
      }
    }
  } catch (error) {
    console.error("Error generating blog analysis:", error)

    // Return mock data if OpenAI API fails
    return {
      summary:
        "This is a mock summary as the AI analysis could not be generated. The blog discusses important concepts related to the topic and provides insights into key areas of interest.",
      keyPoints: [
        "First key point from the blog content",
        "Second important concept discussed",
        "Third significant idea presented",
        "Fourth notable insight shared",
        "Fifth valuable takeaway from the content",
      ],
      quotes: [
        "This is a mock quote from the blog.",
        "Another simulated quote that might represent what was written.",
        "A third example quote from the content.",
      ],
      lessons: [
        "First practical lesson from the blog",
        "Second actionable takeaway",
        "Third important learning point",
        "Fourth valuable insight to apply",
      ],
    }
  }
}

function isValidUrl(string: string) {
  try {
    const url = new URL(string)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}
