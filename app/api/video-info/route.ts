import { exec } from "child_process";
import { type NextRequest, NextResponse } from "next/server";
import { promisify } from "util";

const execAsync = promisify(exec);

// Rate limiting (simple in-memory store)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Clean up expired entries to prevent memory leak
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }

  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

function getYtDlpCommand(): string {
  return "yt-dlp";
}

function validateYouTubeUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const validHosts = [
      "www.youtube.com",
      "youtube.com",
      "youtu.be",
      "m.youtube.com",
    ];

    // Check if hostname is valid
    if (!validHosts.includes(urlObj.hostname)) {
      return false;
    }

    // For youtu.be, the video ID is in the pathname (e.g., /VIDEO_ID)
    if (urlObj.hostname === "youtu.be") {
      return urlObj.pathname.length > 1; // Must have a video ID
    }

    // For other YouTube domains, check for /watch or /shorts/
    return (
      urlObj.pathname.includes("/watch") || urlObj.pathname.includes("/shorts/")
    );
  } catch {
    return false;
  }
}

function sanitizeInput(input: string): string {
  return input.trim().substring(0, 2000);
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Rate limiting
    if (!checkRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required and must be a string" },
        { status: 400 }
      );
    }

    const sanitizedUrl = sanitizeInput(url);

    if (!validateYouTubeUrl(sanitizedUrl)) {
      return NextResponse.json(
        { error: "Invalid YouTube URL format" },
        { status: 400 }
      );
    }

    // Execute yt-dlp command with timeout
    const ytDlpCmd = getYtDlpCommand();
    const command = `${ytDlpCmd} --dump-json --no-download --no-warnings "${sanitizedUrl}"`;

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 second timeout
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      });

      if (stderr && stderr.includes("ERROR")) {
        console.error("yt-dlp stderr:", stderr);
        return NextResponse.json(
          { error: "Video not available or private" },
          { status: 404 }
        );
      }

      const videoInfo = JSON.parse(stdout);

      // Validate required fields
      if (!videoInfo.id || !videoInfo.title) {
        return NextResponse.json(
          { error: "Invalid video data received" },
          { status: 500 }
        );
      }

      // Extract and sanitize video information
      const videoData = {
        id: String(videoInfo.id),
        title: String(videoInfo.title).substring(0, 200),
        channel: String(
          videoInfo.uploader || videoInfo.channel || "Unknown"
        ).substring(0, 100),
        duration: String(videoInfo.duration || 0),
        thumbnail: String(videoInfo.thumbnail || ""),
        description: String(videoInfo.description || "").substring(0, 1000),
        viewCount: formatViewCount(videoInfo.view_count),
        uploadDate: formatUploadDate(videoInfo.upload_date),
        formats: processFormats(videoInfo.formats || []),
      };

      console.log(
        `Video info fetched for ${videoData.id} in ${Date.now() - startTime}ms`
      );
      return NextResponse.json(videoData);
    } catch (execError: any) {
      console.error("yt-dlp execution error:", execError);

      if (execError.code === "TIMEOUT") {
        return NextResponse.json(
          {
            error: "Request timeout. Video might be too large or unavailable.",
          },
          { status: 408 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Failed to fetch video information. Video might be private or unavailable.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function formatViewCount(viewCount?: number): string {
  if (!viewCount) return "0 views";

  if (viewCount >= 1000000000) {
    return `${(viewCount / 1000000000).toFixed(1)}B`;
  } else if (viewCount >= 1000000) {
    return `${(viewCount / 1000000).toFixed(1)}M`;
  } else if (viewCount >= 1000) {
    return `${(viewCount / 1000).toFixed(1)}K`;
  }

  return viewCount.toString();
}

function formatUploadDate(uploadDate?: string): string {
  if (!uploadDate || uploadDate.length < 8) return "Unknown date";

  try {
    // uploadDate is in format YYYYMMDD
    const year = uploadDate.substring(0, 4);
    const month = uploadDate.substring(4, 6);
    const day = uploadDate.substring(6, 8);

    const date = new Date(`${year}-${month}-${day}`);

    // Check if date is valid
    if (isNaN(date.getTime())) {
      return "Unknown date";
    }

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}

function processFormats(formats: any[]): any[] {
  return formats
    .filter((format) => {
      // Filter out formats without proper quality info
      return (
        format.format_id && (format.height || format.abr || format.quality)
      );
    })
    .map((format) => ({
      format_id: format.format_id,
      ext: format.ext || "unknown",
      quality: getQualityString(format),
      filesize: format.filesize,
      format_note: format.format_note,
      vcodec: format.vcodec,
      acodec: format.acodec,
      fps: format.fps,
      tbr: format.tbr,
    }))
    .sort((a, b) => {
      // Sort by quality (video first, then audio)
      const aScore = getQualityScore(a.quality, a.vcodec);
      const bScore = getQualityScore(b.quality, b.vcodec);
      return bScore - aScore;
    });
}

function getQualityString(format: any): string {
  if (format.height) {
    return `${format.height}p`;
  } else if (format.abr) {
    return `${format.abr}kbps`;
  } else if (format.quality) {
    return format.quality;
  } else if (format.format_note) {
    return format.format_note;
  }
  return "Unknown quality";
}

function getQualityScore(quality: string, vcodec?: string): number {
  // Video formats get higher scores
  if (vcodec && vcodec !== "none") {
    const heightMatch = quality.match(/(\d+)p/);
    if (heightMatch) {
      return Number.parseInt(heightMatch[1]) + 10000; // Add 10000 to prioritize video
    }
  }

  // Audio formats
  const bitrateMatch = quality.match(/(\d+)kbps/);
  if (bitrateMatch) {
    return Number.parseInt(bitrateMatch[1]);
  }

  return 0;
}
