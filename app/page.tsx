import { VideoUrlForm } from "../components/video-url-form";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shadow-sm">
              <img
                src="/logo.png"
                alt="YTDown"
                className="h-5 w-5 object-contain"
              />
            </div>
            <span className="text-xl font-bold tracking-tight">YTDown</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 md:py-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
              Save Your Favorite
              <br />
              <span className="text-primary">YouTube Videos</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Fast, simple, and free. Download any video or audio in your
              preferred quality.
            </p>
          </div>

          {/* Video URL Form */}
          <VideoUrlForm />

          {/* Features */}
          <div className="mt-16 md:mt-24 grid gap-6 md:grid-cols-3">
            <div className="text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Lightning Fast</h3>
              <p className="text-sm text-muted-foreground">
                Get your downloads in seconds
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Any Quality</h3>
              <p className="text-sm text-muted-foreground">
                HD video or audio-only options
              </p>
            </div>

            <div className="text-center">
              <div className="inline-flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center mb-4">
                <svg
                  className="h-6 w-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">100% Private</h3>
              <p className="text-sm text-muted-foreground">
                No tracking or data storage
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 mt-20">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground">
            Free to use · For personal use only · Respect content creators
          </p>
        </div>
      </footer>
    </div>
  );
}
