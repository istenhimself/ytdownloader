export interface VideoDetails {
  id: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  description: string;
  viewCount: string;
  uploadDate: string;
  formats: VideoFormat[];
}

export interface VideoFormat {
  format_id: string;
  ext: string;
  quality: string;
  filesize?: number;
  format_note?: string;
  vcodec?: string;
  acodec?: string;
  fps?: number;
  tbr?: number;
}

export class APIError extends Error {
  constructor(message: string, public status: number, public code?: string) {
    super(message);
    this.name = "APIError";
  }
}

export async function fetchVideoInfo(url: string): Promise<VideoDetails> {
  try {
    const response = await fetch("/api/video-info", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      let errorMessage = "Failed to fetch video information";
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If we can't parse error response, use default message
      }

      throw new APIError(errorMessage, response.status);
    }

    const data = await response.json();

    // Validate response structure
    if (!data.id || !data.title) {
      throw new APIError("Invalid video data received", 500);
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new APIError("Network error. Please check your connection.", 0);
    }

    throw new APIError("An unexpected error occurred", 500);
  }
}

export async function downloadVideo(
  url: string,
  formatId: string,
  title: string,
  channel: string,
  signal?: AbortSignal,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track progress
    xhr.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = Math.round((event.loaded / event.total) * 100);
        console.log(
          "XHR Progress:",
          progress,
          "%",
          event.loaded,
          "/",
          event.total
        );
        onProgress(progress);
      } else if (onProgress) {
        console.log("XHR Progress (unknown total):", event.loaded, "bytes");
        // Show indeterminate progress
        onProgress(0);
      }
    });

    // Handle completion
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const contentType = xhr.getResponseHeader("content-type");
          if (
            !contentType ||
            (!contentType.includes("video") && !contentType.includes("audio"))
          ) {
            reject(new APIError("Invalid file type received", 500));
            return;
          }

          const blob = xhr.response;
          if (!blob || blob.size === 0) {
            reject(new APIError("Downloaded file is empty", 500));
            return;
          }

          const contentDisposition = xhr.getResponseHeader(
            "Content-Disposition"
          );
          const filename = contentDisposition
            ? contentDisposition.split("filename=")[1]?.replace(/"/g, "")
            : `${sanitizeFilename(title)} - ${sanitizeFilename(channel)}.mp4`;

          // Create download link
          const downloadUrl = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = downloadUrl;
          link.download = filename;
          link.style.display = "none";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);

          // Clean up after a delay
          setTimeout(() => {
            window.URL.revokeObjectURL(downloadUrl);
          }, 1000);

          resolve();
        } catch (error) {
          reject(new APIError("Failed to process downloaded file", 500));
        }
      } else {
        // Handle error response
        let errorMessage = "Download failed";
        try {
          const errorData = JSON.parse(xhr.responseText);
          errorMessage = errorData.error || errorMessage;
        } catch {
          // If we can't parse error response, use default message
        }
        reject(new APIError(errorMessage, xhr.status));
      }
    });

    // Handle errors
    xhr.addEventListener("error", () => {
      reject(new APIError("Network error. Please check your connection.", 0));
    });

    // Handle abort
    xhr.addEventListener("abort", () => {
      const abortError = new Error("Download cancelled");
      abortError.name = "AbortError";
      reject(abortError);
    });

    // Handle abort signal
    if (signal) {
      signal.addEventListener("abort", () => {
        xhr.abort();
      });
    }

    // Open and send request
    xhr.open("POST", "/api/download");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.responseType = "blob";
    xhr.send(JSON.stringify({ url, formatId, title, channel }));
  });
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .substring(0, 200); // Match server-side limit
}
