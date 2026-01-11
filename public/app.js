/**
 * Frontend logic:
 * - Fetch /api/videos
 * - Render a simple list
 * - On click, set <video src> to /api/stream/:name and play
 */

const videoListEl = document.getElementById("videoList");
const picturesListEl = document.getElementById("picturesList");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refreshBtn");
const playerEl = document.getElementById("player");
const imageEl = document.getElementById("imageViewer");
const nowPlayingEl = document.getElementById("nowPlaying");

// Keep track of selected item so we can highlight it (simple UX)
let selectedName = null;

function extOf(fileName) {
  const i = fileName.lastIndexOf(".");
  return i >= 0 ? fileName.slice(i + 1).toUpperCase() : "";
}

function setStatus(text) {
  statusEl.textContent = text;
  statusEl.style.display = text ? "block" : "none";
}

function clearLists() {
  videoListEl.innerHTML = "";
  picturesListEl.innerHTML = "";
}

async function handleSelect(name, asImage) {
  selectedName = name;

  // Update "now playing" text
  nowPlayingEl.textContent = `${asImage ? "Now viewing" : "Now playing"}: ${name}`;

  // Point the media element to the streaming endpoint.
  // encodeURIComponent is critical for spaces and special characters in filenames.
  const url = `/api/stream/${encodeURIComponent(name)}`;

  if (asImage) {
    // Hide video player, show image
    playerEl.pause();
    playerEl.removeAttribute("src");
    playerEl.load();
    playerEl.style.display = "none";

    imageEl.src = url;
    imageEl.alt = name;
    imageEl.style.display = "block";
  } else {
    // Reset the player before setting a new src (helps with switching videos)
    imageEl.removeAttribute("src");
    imageEl.style.display = "none";

    playerEl.style.display = "block";
    playerEl.pause();
    playerEl.removeAttribute("src");
    playerEl.load();

    playerEl.src = url;

    // Try to autoplay after user interaction (allowed by browsers)
    try {
      await playerEl.play();
    } catch {
      // If autoplay is blocked for some reason, user can hit Play.
    }
  }

  // Simple visual indication: bold the selected item
  document.querySelectorAll(".video-btn").forEach((b) => {
    b.style.fontWeight = b.dataset.name === selectedName ? "700" : "400";
  });
}

function renderList(listEl, names, asImage, emptyText) {
  listEl.innerHTML = "";

  if (!names.length) {
    const li = document.createElement("li");
    li.className = "placeholder";
    li.textContent = emptyText;
    listEl.appendChild(li);
    return;
  }

  for (const name of names) {

    const li = document.createElement("li");
    li.className = "video-item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "video-btn";
    btn.dataset.name = name;

    const left = document.createElement("span");
    left.className = "video-name";
    left.textContent = name;

    const badge = document.createElement("span");
    badge.className = "badge";
    badge.textContent = extOf(name);

    btn.appendChild(left);
    btn.appendChild(badge);

    btn.addEventListener("click", async () => {
      await handleSelect(name, asImage);
    });

    li.appendChild(btn);
    listEl.appendChild(li);
  }
}

async function loadVideos() {
  setStatus("Loading…");
  clearLists();

  try {
    const res = await fetch("/api/videos");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const { videos = [], pictures = [] } = await res.json();

    renderList(
      videoListEl,
      videos,
      false,
      "No videos found in /videos (mp4, webm)."
    );
    renderList(
      picturesListEl,
      pictures,
      true,
      "No pictures found in /pictures (jpg/jpeg)."
    );

    if (!videos.length && !pictures.length) {
      setStatus("No media found.");
    } else {
      setStatus("");
    }
  } catch (err) {
    console.error(err);
    setStatus("Could not load videos. Is the server running?");
  }
}

refreshBtn.addEventListener("click", loadVideos);

// Initial load
loadVideos();
