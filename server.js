/**
 * Simple local-network video server.
 *
 * - Lists video files from ./videos
 * - Streams video files with HTTP Range requests
 * - Serves a static frontend from ./public
 *
 * Keep this simple: no auth, no DB, local network only.
 */

const express = require("express");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const app = express();

// Absolute paths to important folders
const PUBLIC_DIR = path.join(__dirname, "public");
const VIDEOS_DIR = path.join(__dirname, "videos");
const PICTURES_DIR = path.join(__dirname, "pictures");

// Only allow common formats you asked for
const VIDEO_EXTENSIONS = new Set([".mp4", ".webm"]);
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg"]);
const ALLOWED_EXTENSIONS = new Set([...VIDEO_EXTENSIONS, ...IMAGE_EXTENSIONS]);

// Serve the frontend (index.html, app.js, styles.css)
app.use(express.static(PUBLIC_DIR));

/**
 * GET /api/videos
 * Returns: [{ name: "some-file.mp4" }, ...]
 */
app.get("/api/videos", async (req, res) => {
  try {
    const [videoEntries, pictureEntries] = await Promise.all([
      fsp.readdir(VIDEOS_DIR, { withFileTypes: true }).catch((err) => {
        if (err && err.code === "ENOENT") return [];
        throw err;
      }),
      fsp.readdir(PICTURES_DIR, { withFileTypes: true }).catch((err) => {
        if (err && err.code === "ENOENT") return [];
        throw err;
      })
    ]);

    const videoFiles = videoEntries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => VIDEO_EXTENSIONS.has(path.extname(name).toLowerCase()));

    const pictureFiles = pictureEntries
      .filter((e) => e.isFile())
      .map((e) => e.name)
      .filter((name) => IMAGE_EXTENSIONS.has(path.extname(name).toLowerCase()));

    res.json({
      videos: videoFiles.sort((a, b) => a.localeCompare(b)),
      pictures: pictureFiles.sort((a, b) => a.localeCompare(b))
    });
  } catch (err) {
    console.error("Error reading media folders:", err);
    res.status(500).json({ error: "Could not read media folders." });
  }
});

/**
 * Basic MIME types for the formats we support.
 * (Browsers rely on Content-Type for proper playback.)
 */
function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  return "application/octet-stream";
}

/**
 * GET /api/stream/:name
 *
 * Streams the requested file using Range requests.
 * This allows:
 * - efficient playback
 * - seeking in the timeline
 * - not reading the whole file into memory
 */
app.get("/api/stream/:name", async (req, res) => {
  try {
    // Decode URL-encoded filename, e.g. "My%20Video.mp4"
    const requestedName = decodeURIComponent(req.params.name);

    // Prevent path traversal (e.g. "../../secret")
    // We only allow filenames, not paths.
    const safeName = path.basename(requestedName);
    if (safeName !== requestedName) {
      return res.status(400).send("Invalid file name.");
    }

    const ext = path.extname(safeName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      return res.status(415).send("Unsupported media type.");
    }

    const baseDir = VIDEO_EXTENSIONS.has(ext) ? VIDEOS_DIR : PICTURES_DIR;
    const videoPath = path.join(baseDir, safeName);

    // Check file exists and get size
    const stat = await fsp.stat(videoPath);
    const fileSize = stat.size;

    const range = req.headers.range;
    const contentType = getContentType(safeName);

    // If the browser sends a Range header, we return partial content (206)
    if (range) {
      // Example: "bytes=0-"
      const match = range.match(/bytes=(\d+)-(\d*)/);
      if (!match) {
        return res.status(416).send("Malformed Range header.");
      }

      const start = parseInt(match[1], 10);
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        return res.status(416).send("Requested range not satisfiable.");
      }

      const chunkSize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": contentType
      });

      const stream = fs.createReadStream(videoPath, { start, end });
      stream.pipe(res);

      stream.on("error", (err) => {
        console.error("Stream error:", err);
        res.end();
      });

      return;
    }

    // If no Range header, stream the whole file (still not in memory)
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": contentType
    });

    const stream = fs.createReadStream(videoPath);
    stream.pipe(res);

    stream.on("error", (err) => {
      console.error("Stream error:", err);
      res.end();
    });
  } catch (err) {
    console.error("Error streaming file:", err);
    // Not found vs other errors
    if (err && err.code === "ENOENT") return res.status(404).send("Not found.");
    res.status(500).send("Server error.");
  }
});

// Bind to all interfaces so other devices on Wi‑Fi can access it.
const PORT = process.env.PORT || 3000;
const HOST = "0.0.0.0";

app.listen(PORT, HOST, () => {
  console.log(`Video server running at http://${HOST}:${PORT}`);
  console.log(`Serving videos from: ${VIDEOS_DIR}`);
});
