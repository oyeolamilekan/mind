"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { analyzeBlog } from "@/lib/blog-actions"
import { Loader2 } from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"

type BlogAnalysisResult = {
  title: string
  url: string
  summary: string
  keyPoints: string[]
  quotes: string[]
  lessons: string[]
  error?: string | null
  needsManualContent?: boolean
}

export function BlogAnalyzer() {
  const [url, setUrl] = useState("")
  const [manualContent, setManualContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<BlogAnalysisResult | null>(null)
  const [error, setError] = useState("")
  const [needsManualContent, setNeedsManualContent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!url && !manualContent) {
      setError("Please enter a blog URL or paste the content directly")
      return
    }

    try {
      setIsLoading(true)
      setError("")

      const data = await analyzeBlog(url, needsManualContent ? manualContent : undefined)

      if (data.error) {
        if (data.needsManualContent) {
          setNeedsManualContent(true)
          setError(`We couldn't access the content at this URL: ${data.error}. Please paste the article content below.`)
        } else {
          setError(data.error)
        }
        setResult(null)
      } else {
        setResult(data)
        setNeedsManualContent(false)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(`Failed to analyze blog: ${err.message || "Unknown error"}. Please check the URL and try again.`)
      } else {
        setError("An unknown error occurred while analyzing the blog.")
      }
      console.error(err)
      setResult(null)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setNeedsManualContent(false)
    setManualContent("")
    setError("")
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            type="text"
            placeholder="Paste blog URL here"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              if (needsManualContent) resetForm()
            }}
            className="flex-1"
            disabled={isLoading}
          />
          <Button type="submit" disabled={isLoading || (needsManualContent && !manualContent)}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing
              </>
            ) : (
              "Analyze"
            )}
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {needsManualContent && (
          <div className="space-y-2">
            <Textarea
              placeholder="Paste the article content here..."
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              className="min-h-[200px]"
            />
            <div className="flex justify-between">
              <Button variant="outline" onClick={resetForm} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={!manualContent || isLoading}>
                {isLoading ? "Analyzing..." : "Analyze Content"}
              </Button>
            </div>
          </div>
        )}
      </form>

      {result && !error && (
        <div className="space-y-4 border rounded-lg p-4">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold">{result.title}</h2>
            <p className="text-sm text-muted-foreground">
              <a href={result.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                {result.url}
              </a>
            </p>
          </div>

          <Tabs defaultValue="summary">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="keyPoints">Key Points</TabsTrigger>
              <TabsTrigger value="quotes">Quotes</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
            </TabsList>

            <TabsContent value="summary" className="mt-4">
              <p className="text-sm leading-relaxed">{result.summary}</p>
            </TabsContent>

            <TabsContent value="keyPoints" className="mt-4">
              <ul className="list-disc pl-5 space-y-2">
                {result.keyPoints.map((point, index) => (
                  <li key={index} className="text-sm">
                    {point}
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="quotes" className="mt-4">
              <ul className="space-y-3">
                {result.quotes.map((quote, index) => (
                  <li key={index} className="text-sm border-l-2 pl-3 py-1">
                    {quote}
                  </li>
                ))}
              </ul>
            </TabsContent>

            <TabsContent value="lessons" className="mt-4">
              <ul className="list-disc pl-5 space-y-2">
                {result.lessons.map((lesson, index) => (
                  <li key={index} className="text-sm">
                    {lesson}
                  </li>
                ))}
              </ul>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )
}
