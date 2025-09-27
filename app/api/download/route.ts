import { exec } from "child_process";
import {
  createReadStream,
  existsSync,
  readdirSync,
  statSync,
  unlinkSync,
} from "fs";
import { type NextRequest, NextResponse } from "next/server";
import { tmpdir } from "os";
import { join } from "path";
import { promisify } from "util";

const execAsync = promisify(exec);

// Rate limiting for downloads (more restrictive)
const downloadRateLimitMap = new Map<
  string,
  { count: number; resetTime: number }
>();
const DOWNLOAD_RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const DOWNLOAD_RATE_LIMIT_MAX_REQUESTS = 10; // 10 downloads per minute

function checkDownloadRateLimit(ip: string): boolean {
  const now = Date.now();

  // Clean up expired entries to prevent memory leak
  for (const [key, value] of downloadRateLimitMap.entries()) {
    if (now > value.resetTime) {
      downloadRateLimitMap.delete(key);
    }
  }

  const userLimit = downloadRateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    downloadRateLimitMap.set(ip, {
      count: 1,
      resetTime: now + DOWNLOAD_RATE_LIMIT_WINDOW,
    });
    return true;
  }

  if (userLimit.count >= DOWNLOAD_RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  userLimit.count++;
  return true;
}

function getYtDlpCommand(): string {
  return "yt-dlp";
}

function getTempDir(): string {
  if (process.env.VERCEL) {
    return "/tmp";
  }
  return tmpdir();
}

function validateFormatId(formatId: string): boolean {
  // Allow alphanumeric format IDs and common patterns
  return /^[a-zA-Z0-9_-]+$/.test(formatId) && formatId.length <= 20;
}

function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[<>:"/\\|?*]/g, "") // Remove invalid characters
    .replace(/[^\x20-\x7E]/g, "") // Remove non-ASCII characters
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim()
    .substring(0, 200); // Limit length to 200 characters
}

function getContentType(fileExtension: string): string {
  const contentTypes: Record<string, string> = {
    mp4: "video/mp4",
    webm: "video/webm",
    mkv: "video/x-matroska",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    m4a: "audio/mp4",
    aac: "audio/aac",
    ogg: "audio/ogg",
    wav: "audio/wav",
  };
  return (
    contentTypes[fileExtension.toLowerCase()] || "application/octet-stream"
  );
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const clientIP = request.headers.get("x-forwarded-for") || "unknown";

  try {
    // Rate limiting for downloads
    if (!checkDownloadRateLimit(clientIP)) {
      return NextResponse.json(
        { error: "Download rate limit exceeded. Please try again later." },
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

    const { url, formatId, title, channel } = body;

    // Validate required fields
    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "URL is required and must be a string" },
        { status: 400 }
      );
    }

    if (!formatId || typeof formatId !== "string") {
      return NextResponse.json(
        { error: "Format ID is required and must be a string" },
        { status: 400 }
      );
    }

    if (!validateFormatId(formatId)) {
      return NextResponse.json({ error: "Invalid format ID" }, { status: 400 });
    }

    // Sanitize inputs
    const sanitizedTitle = sanitizeFilename(title || "video");
    const sanitizedChannel = sanitizeFilename(channel || "unknown");
    const filename = `${sanitizedTitle} - ${sanitizedChannel}`;

    // Create temporary directory for download
    const tempDir = getTempDir();
    const outputPath = join(tempDir, `${filename}.%(ext)s`);

    // Use yt-dlp to download the specific format
    const ytDlpCmd = getYtDlpCommand();
    const command = `${ytDlpCmd} -f ${formatId} -o "${outputPath}" --no-warnings "${url}"`;

    try {
      console.log(`Starting download for ${clientIP}: ${filename}`);

      // Set timeout based on environment
      const timeout = process.env.VERCEL ? 250000 : 300000;
      const { stdout, stderr } = await execAsync(command, {
        timeout,
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      });

      if (stderr && stderr.includes("ERROR")) {
        console.error("yt-dlp download error:", stderr);
        return NextResponse.json(
          {
            error:
              "Download failed. Video might be unavailable or format not supported.",
          },
          { status: 404 }
        );
      }

      console.log("Download completed:", stdout);

      // Find the downloaded file using proper file system methods
      const files = readdirSync(tempDir);
      const downloadedFiles = files.filter((f) => f.includes(filename));

      if (downloadedFiles.length === 0) {
        return NextResponse.json(
          { error: "Download completed but file not found" },
          { status: 500 }
        );
      }

      const downloadedFile = downloadedFiles[0];
      const filePath = join(tempDir, downloadedFile);

      if (!existsSync(filePath)) {
        return NextResponse.json(
          { error: "Downloaded file not found" },
          { status: 500 }
        );
      }

      // Check file size (limit to 2GB)
      const fileStats = statSync(filePath);
      const maxFileSize = 2000 * 1024 * 1024; // 2GB

      if (fileStats.size > maxFileSize) {
        unlinkSync(filePath); // Clean up large file
        return NextResponse.json(
          { error: "File too large. Maximum size is 2GB." },
          { status: 413 }
        );
      }

      // Stream the file to the client
      const fileStream = createReadStream(filePath);
      const fileExtension = downloadedFile.split(".").pop() || "mp4";
      const contentType = getContentType(fileExtension);

      // Clean up the file after streaming completes or on error
      fileStream.on("end", () => {
        try {
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`Cleaned up file after streaming: ${downloadedFile}`);
          }
        } catch (error) {
          console.error("Error cleaning up file:", error);
        }
      });

      fileStream.on("error", () => {
        try {
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`Cleaned up file after error: ${downloadedFile}`);
          }
        } catch (error) {
          console.error("Error cleaning up file:", error);
        }
      });

      // Fallback cleanup in case stream events don't fire (e.g., client disconnect)
      setTimeout(() => {
        try {
          if (existsSync(filePath)) {
            unlinkSync(filePath);
            console.log(`Fallback cleanup for file: ${downloadedFile}`);
          }
        } catch (error) {
          console.error("Error in fallback cleanup:", error);
        }
      }, 300000); // 5 minute fallback delay

      console.log(
        `Download completed for ${clientIP} in ${
          Date.now() - startTime
        }ms: ${downloadedFile}`
      );

      return new NextResponse(fileStream as any, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `attachment; filename="${downloadedFile}"`,
          "Content-Length": fileStats.size.toString(),
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    } catch (execError: any) {
      console.error("Download execution error:", execError);

      if (execError.code === "TIMEOUT") {
        return NextResponse.json(
          {
            error: "Download timeout. Video might be too large or unavailable.",
          },
          { status: 408 }
        );
      }

      return NextResponse.json(
        {
          error:
            "Download failed. The video might be unavailable or the format might not be supported.",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Download API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
