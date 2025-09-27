"use client";

import type React from "react";
import { useEffect, useRef, useState } from "react";
import {
  APIError,
  downloadVideo,
  fetchVideoInfo,
  type VideoDetails as VideoDetailsType,
} from "@/lib/api";
import { DownloadProgress } from "@/components/download-progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoDetails } from "@/components/video-details";

interface DownloadItem {
  id: string;
  title: string;
  channel: string;
  format: string;
  status:
    | "queued"
    | "preparing"
    | "downloading"
    | "completed"
    | "error"
    | "cancelled";
  progress?: number;
  error?: string;
  abortController?: AbortController;
  // Store download metadata
  url?: string;
  formatId?: string;
}

// Download queue configuration
const MAX_CONCURRENT_DOWNLOADS = 1; // Only one download at a time

export function VideoUrlForm() {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [videoData, setVideoData] = useState<VideoDetailsType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [activeDownloads, setActiveDownloads] = useState(0);
  const downloadsRef = useRef<HTMLDivElement>(null);
  const downloadQueueRef = useRef<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const videoInfo = await fetchVideoInfo(url);
      setVideoData(videoInfo);
    } catch (err) {
      if (err instanceof APIError) {
        if (err.status === 429) {
          setError(
            "Whoa, slow down! Please wait a moment before trying again."
          );
        } else if (err.status === 400) {
          setError(
            "Hmm, that doesn't look like a valid YouTube link. Can you double-check?"
          );
        } else if (err.status === 404) {
          setError(
            "We couldn't find that video. It might be private or deleted."
          );
        } else {
          setError(err.message);
        }
      } else {
        setError(
          "Oops! Something went wrong. Please check your internet connection and try again."
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-process download queue when state changes
  useEffect(() => {
    const processQueue = async () => {
      // If already processing or queue is empty, return
      if (
        activeDownloads >= MAX_CONCURRENT_DOWNLOADS ||
        downloadQueueRef.current.length === 0
      ) {
        return;
      }

      const downloadId = downloadQueueRef.current.shift();
      if (!downloadId) return;

      // Use functional update to get latest state
      setDownloads((currentDownloads) => {
        const download = currentDownloads.find((d) => d.id === downloadId);

        if (!download || download.status !== "queued") {
          // Skip if download was cancelled or not found, try next
          setTimeout(() => processQueue(), 0);
          return currentDownloads;
        }

        if (!download.url || !download.formatId) {
          console.error("Download missing required metadata");
          setTimeout(() => processQueue(), 0);
          return currentDownloads;
        }

        // Start the download process
        startDownload(
          downloadId,
          download.url,
          download.formatId,
          download.title,
          download.channel,
          download.abortController
        );

        // Update status to preparing
        return currentDownloads.map((d) =>
          d.id === downloadId ? { ...d, status: "preparing" as const } : d
        );
      });
    };

    processQueue();
    // Only depend on activeDownloads and queue changes, not all downloads state
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDownloads, downloads.length]);

  const handleDownload = async (format: any) => {
    if (!videoData) return;

    const downloadId = `${videoData.id}-${format.format_id}-${Date.now()}`;
    const abortController = new AbortController();

    // Add download to the list with queued status
    const newDownload: DownloadItem = {
      id: downloadId,
      title: videoData.title,
      channel: videoData.channel,
      format: `${format.quality} (${format.ext.toUpperCase()})`,
      status: "queued",
      abortController,
      url: url,
      formatId: format.format_id,
    };

    setDownloads((prev) => [newDownload, ...prev]);
    downloadQueueRef.current.push(downloadId);

    // Scroll to downloads section
    setTimeout(() => {
      downloadsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);
  };

  const startDownload = async (
    downloadId: string,
    downloadUrl: string,
    formatId: string,
    title: string,
    channel: string,
    abortController?: AbortController
  ) => {
    setActiveDownloads((prev) => prev + 1);

    try {
      // Update status to downloading
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId ? { ...d, status: "downloading" as const } : d
        )
      );

      await downloadVideo(
        downloadUrl,
        formatId,
        title,
        channel,
        abortController?.signal,
        (progress) => {
          // Update progress in real-time
          console.log("Progress callback received:", progress);
          setDownloads((prev) =>
            prev.map((d) => (d.id === downloadId ? { ...d, progress } : d))
          );
        }
      );

      // Update status to completed
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId ? { ...d, status: "completed" as const } : d
        )
      );
    } catch (err) {
      // Check if download was cancelled
      if (err instanceof Error && err.name === "AbortError") {
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === downloadId ? { ...d, status: "cancelled" as const } : d
          )
        );
      } else {
        let errorMessage = "Download failed. Let's try that again.";

        if (err instanceof APIError) {
          if (err.status === 429) {
            errorMessage =
              "Too many downloads at once! Give us a moment and try again.";
          } else if (err.status === 413) {
            errorMessage =
              "This file is too large. Try selecting a smaller quality option.";
          } else if (err.status === 408) {
            errorMessage = "Download took too long. Please try again.";
          } else {
            errorMessage = err.message;
          }
        }

        // Update status to error
        setDownloads((prev) =>
          prev.map((d) =>
            d.id === downloadId
              ? { ...d, status: "error" as const, error: errorMessage }
              : d
          )
        );
      }
    } finally {
      setActiveDownloads((prev) => prev - 1);
      // Queue will auto-process via useEffect when activeDownloads changes
    }
  };

  const handleCancelDownload = (downloadId: string) => {
    const download = downloads.find((d) => d.id === downloadId);

    // Remove from queue if it's queued
    if (download?.status === "queued") {
      downloadQueueRef.current = downloadQueueRef.current.filter(
        (id) => id !== downloadId
      );
      // Update status to cancelled
      setDownloads((prev) =>
        prev.map((d) =>
          d.id === downloadId ? { ...d, status: "cancelled" as const } : d
        )
      );
    } else if (download?.abortController) {
      // Abort if it's actively downloading
      download.abortController.abort();
    }
  };

  const handleRetryDownload = async (downloadId: string) => {
    const download = downloads.find((d) => d.id === downloadId);
    if (!download) return;

    // Create new AbortController for the retry
    const abortController = new AbortController();

    // Reset download status to queued with new AbortController
    setDownloads((prev) =>
      prev.map((d) =>
        d.id === downloadId
          ? {
              ...d,
              status: "queued" as const,
              error: undefined,
              progress: undefined,
              abortController,
            }
          : d
      )
    );

    // Add back to queue
    downloadQueueRef.current.push(downloadId);

    // Scroll to downloads section
    setTimeout(() => {
      downloadsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    // Queue will auto-process via useEffect
  };

  const handleClearCompleted = () => {
    setDownloads((prev) => prev.filter((d) => d.status !== "completed"));
  };

  const handleNewVideo = () => {
    setVideoData(null);
    setUrl("");
    setError(null);
  };

  const isValidYouTubeUrl = (url: string) => {
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    return youtubeRegex.test(url);
  };

  const hasActiveDownloads = downloads.some(
    (d) => d.status === "preparing" || d.status === "downloading"
  );

  // Get currently downloading format IDs
  const downloadingFormatIds = downloads
    .filter(
      (d) =>
        (d.status === "preparing" ||
          d.status === "downloading" ||
          d.status === "queued") &&
        d.formatId
    )
    .map((d) => d.formatId);

  if (videoData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleNewVideo}
            disabled={hasActiveDownloads}
            className="text-sm"
          >
            ← New Download
          </Button>
        </div>

        <VideoDetails
          video={videoData}
          onDownload={handleDownload}
          isDownloading={false}
          downloadingFormatIds={downloadingFormatIds}
          downloads={downloads}
          onClearCompleted={handleClearCompleted}
          onRetryDownload={handleRetryDownload}
          onCancelDownload={handleCancelDownload}
          downloadsRef={downloadsRef}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border/50 rounded-2xl p-6 md:p-8 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <label htmlFor="video-url" className="text-sm font-medium block">
              Paste YouTube Link Here
            </label>
            <div className="space-y-3">
              <Input
                id="video-url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-12 text-base"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!url.trim() || !isValidYouTubeUrl(url) || isLoading}
                className="w-full h-12 text-base font-semibold"
                size="lg"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                    <span>Loading</span>
                  </div>
                ) : (
                  "Continue"
                )}
              </Button>
            </div>
            {url && !isValidYouTubeUrl(url) && (
              <p className="text-sm text-destructive">
                Please paste a valid YouTube link
              </p>
            )}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Works with videos, shorts, and music
            </p>
          </div>
        </form>
      </div>

      {downloads.length > 0 && (
        <DownloadProgress
          downloads={downloads}
          onClearCompleted={handleClearCompleted}
          onRetryDownload={handleRetryDownload}
          onCancelDownload={handleCancelDownload}
        />
      )}
    </div>
  );
}
