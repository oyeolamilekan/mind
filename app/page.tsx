import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VideoAnalyzer } from "@/components/video-analyzer"
import { BlogAnalyzer } from "@/components/blog-analyzer"

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 md:p-24">
      <div className="max-w-3xl w-full space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Content Analyzer</h1>
          <p className="text-muted-foreground">Extract insights from YouTube videos and blog articles</p>
        </div>

        <Tabs defaultValue="video" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="video">YouTube Videos</TabsTrigger>
            <TabsTrigger value="blog">Blog Articles</TabsTrigger>
          </TabsList>

          <TabsContent value="video" className="mt-6">
            <VideoAnalyzer />
          </TabsContent>

          <TabsContent value="blog" className="mt-6">
            <BlogAnalyzer />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  )
}
