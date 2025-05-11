"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

type TranscriptItem = {
  text: string
  offset: number
  duration: number
}

interface TranscriptViewerProps {
  transcript: TranscriptItem[]
}

export function TranscriptViewer({ transcript }: TranscriptViewerProps) {
  const [searchTerm, setSearchTerm] = useState("")

   // Format seconds to HH:MM:SS.mmm
   const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    const milliseconds = Math.floor((totalSeconds % 1) * 1000);

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  }

  // Filter transcript based on search term
  const filteredTranscript = transcript.filter((item) => item.text.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <div className="space-y-4">
      <Input
        type="text"
        placeholder="Search transcript..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="mb-2"
      />

      <ScrollArea className="h-[400px] rounded-xl border bg-white shadow p-4 dark:bg-gray-900 dark:border-gray-700">
        {filteredTranscript.length > 0 ? (
          <div className="space-y-4">
            {filteredTranscript.map((item, index) => (
              <div
                key={index}
                className="flex items-baseline gap-3 group hover:bg-blue-50 hover:rounded transition px-2 py-1 dark:hover:bg-blue-900"
              >
                <span className="font-mono text-xs text-muted-foreground min-w-[110px] group-hover:text-blue-600 transition dark:text-gray-400 dark:group-hover:text-blue-300">
                  {formatTime(item.offset)}
                </span>
                <span className="text-base leading-relaxed group-hover:bg-blue-100 group-hover:rounded px-1 transition dark:group-hover:bg-blue-900 dark:text-gray-100">
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8 dark:text-gray-400">
            {searchTerm ? "No matching transcript segments found." : "No transcript available."}
          </p>
        )}
      </ScrollArea>
    </div>
  )
}
