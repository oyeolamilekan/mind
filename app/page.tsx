import { VideoAnalyzer } from "@/components/video-analyzer"

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-100 dark:bg-gray-950">
      <h1 className="text-4xl font-bold mb-4 text-center text-gray-900 dark:text-gray-100">Welcome to the Video Analyzer</h1>
      <p className="text-lg mb-8 text-center text-gray-700 dark:text-gray-300">Analyze YouTube videos and get insights!</p>
      <div className="w-full max-w-2xl bg-white dark:bg-gray-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-800">
        <VideoAnalyzer />
      </div>
    </div>
  )
}
