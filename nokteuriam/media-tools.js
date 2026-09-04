// ============================================================
// Drawing canvas — a minimal MS-Paint-style freehand sketchpad
// that outputs SVG directly (no raster conversion step, no library).
//
// Draws with native Pointer Events (works for mouse, touch, and
// stylus alike). Each stroke becomes one <path> in the SVG.
// ============================================================

function attachDrawingCanvas(svgEl) {
  let currentPoints = [];
  let currentPath = null;
  let drawing = false;
  const strokes = []; // keep references so "Undo" can pop the last one

  function pointFromEvent(evt) {
    const rect = svgEl.getBoundingClientRect();
    const viewBox = svgEl.viewBox.baseVal;
    const x = ((evt.clientX - rect.left) / rect.width) * viewBox.width;
    const y = ((evt.clientY - rect.top) / rect.height) * viewBox.height;
    return [x, y];
  }

  function startStroke(evt) {
    drawing = true;
    currentPoints = [pointFromEvent(evt)];
    currentPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    currentPath.setAttribute("fill", "none");
    currentPath.setAttribute("stroke", "#000");
    currentPath.setAttribute("stroke-width", "3");
    currentPath.setAttribute("stroke-linecap", "round");
    currentPath.setAttribute("stroke-linejoin", "round");
    svgEl.appendChild(currentPath);
  }

  function continueStroke(evt) {
    if (!drawing) return;
    currentPoints.push(pointFromEvent(evt));
    currentPath.setAttribute("d", pointsToPath(currentPoints));
  }

  function endStroke() {
    if (!drawing) return;
    drawing = false;
    if (currentPoints.length > 1) {
      strokes.push(currentPath);
    } else if (currentPath) {
      currentPath.remove(); // a plain click with no drag — discard
    }
    currentPath = null;
  }

  function pointsToPath(points) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  }

  svgEl.addEventListener("pointerdown", startStroke);
  svgEl.addEventListener("pointermove", continueStroke);
  svgEl.addEventListener("pointerup", endStroke);
  svgEl.addEventListener("pointerleave", endStroke);

  return {
    clear() {
      strokes.forEach(s => s.remove());
      strokes.length = 0;
    },
    undo() {
      const last = strokes.pop();
      if (last) last.remove();
    },
    isEmpty() {
      return strokes.length === 0;
    },
    // Serializes the current drawing to an uploadable SVG File.
    toFile(filenameBase) {
      const clone = svgEl.cloneNode(true);
      clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      const svgText = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([svgText], { type: "image/svg+xml" });
      return new File([blob], `${filenameBase}.svg`, { type: "image/svg+xml" });
    }
  };
}

// ============================================================
// Audio recording — MediaRecorder is a native, open Web API
// (no external library needed). Always requests the Opus codec;
// the browser supplies whichever container it natively supports
// (Ogg in Firefox, WebM elsewhere) — Opus is what actually
// determines size/quality, so this gets the lightest, clearest
// result on every browser without the user choosing anything.
// ============================================================

function isRecordingSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder);
}

function pickAudioMimeType() {
  const candidates = [
    "audio/ogg;codecs=opus",
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4"
  ];
  return candidates.find(type => MediaRecorder.isTypeSupported(type)) || "";
}

// Returns a controller object. onStop receives a File ready for upload.
// onError receives a short, human-readable message (mic missing, permission
// denied, etc.) rather than a raw browser exception.
async function startAudioRecording(onStop, onError) {
  if (!isRecordingSupported()) {
    onError("Audio recording isn't supported in this browser. Please upload a file instead.");
    return null;
  }

  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    if (err.name === "NotFoundError" || err.name === "OverconstrainedError") {
      onError("No microphone was found on this device.");
    } else if (err.name === "NotAllowedError" || err.name === "SecurityError") {
      onError("Microphone access was blocked. Allow microphone permission and try again.");
    } else {
      onError("Could not access the microphone: " + err.message);
    }
    return null;
  }

  const mimeType = pickAudioMimeType();
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks = [];

  recorder.addEventListener("dataavailable", (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  });

  recorder.addEventListener("stop", () => {
    stream.getTracks().forEach(t => t.stop()); // release the microphone
    const finalType = recorder.mimeType || mimeType || "audio/webm";
    const extension = finalType.includes("ogg") ? "ogg" : finalType.includes("mp4") ? "m4a" : "webm";
    const blob = new Blob(chunks, { type: finalType });
    const file = new File([blob], `recording_${Date.now()}.${extension}`, { type: finalType });
    onStop(file);
  });

  recorder.start();
  return recorder; // caller keeps this to call .stop() later
}