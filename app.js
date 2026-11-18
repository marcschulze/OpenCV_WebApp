const BLOCKS = {
  grayscale: {
    name: "Grauwertbild",
    short: "GRAY",
    description: "Farben in Helligkeitswerte umwandeln",
    params: [
      {
        key: "mode",
        label: "Konvertierung",
        type: "select",
        default: "luma",
        options: [
          ["luma", "RGBA → Grau (Luminanz)"],
          ["red", "Rotkanal"],
          ["green", "Grünkanal"],
          ["blue", "Blaukanal"],
        ],
        help: "Luminanz gewichtet die Farbkanäle nach der wahrgenommenen Helligkeit. Alternativ lässt sich ein einzelner Kanal extrahieren.",
      },
    ],
    process: processGrayscale,
  },
  threshold: {
    name: "Binarisierung",
    short: "0/1",
    description: "Pixel anhand eines Schwellwerts trennen",
    params: [
      { key: "threshold", label: "Schwellwert", type: "range", default: 127, min: 0, max: 255, step: 1, help: "Pixel oberhalb dieses Werts werden entsprechend dem gewählten Modus auf den Maximalwert gesetzt." },
      { key: "maxValue", label: "Maximalwert", type: "range", default: 255, min: 0, max: 255, step: 1, help: "Ausgabewert für Pixel, die die Schwellwert-Bedingung erfüllen. OpenCV verwendet typischerweise 255." },
      {
        key: "type", label: "Methode", type: "select", default: "binary", help: "Bestimmt, wie Werte ober- und unterhalb des Schwellwerts abgebildet werden.",
        options: [["binary", "Binär"], ["binaryInv", "Binär invertiert"], ["truncate", "Abschneiden"], ["toZero", "Unterdrücken"], ["otsu", "Otsu automatisch"]],
      },
    ],
    process: processThreshold,
  },
  canny: {
    name: "Kantendetektion",
    short: "EDGE",
    description: "Canny-Kanten im Bild hervorheben",
    params: [
      { key: "low", label: "Untere Schwelle", type: "range", default: 50, min: 0, max: 500, step: 1, help: "Kanten unterhalb dieses Werts werden verworfen. Niedrigere Werte finden mehr, aber auch schwächere Kanten." },
      { key: "high", label: "Obere Schwelle", type: "range", default: 150, min: 1, max: 500, step: 1, help: "Kanten oberhalb dieses Werts gelten sicher als Kante. Werte dazwischen werden über ihre Nachbarschaft bewertet." },
      { key: "aperture", label: "Sobel-Kernel", type: "select", default: 3, options: [[3, "3 × 3"], [5, "5 × 5"], [7, "7 × 7"]], help: "Größe des Sobel-Operators zur Berechnung des Bildgradienten. Größere Kernel glätten stärker." },
      { key: "l2", label: "L2-Gradient", type: "checkbox", default: false, help: "Berechnet die genauere euklidische Gradientenlänge statt einer schnelleren Näherung." },
    ],
    process: processCanny,
  },
  circle: {
    name: "Kreisfit",
    short: "○",
    description: "Kreis an die größte Kontur anpassen",
    params: [
      { key: "minPoints", label: "Min. Konturpunkte", type: "range", default: 30, min: 3, max: 500, step: 1, help: "Konturen mit weniger Punkten werden ignoriert. Ein höherer Wert unterdrückt kleine Störungen." },
      { key: "edgeLow", label: "Kantenschwelle", type: "range", default: 50, min: 0, max: 255, step: 1, help: "Untere Canny-Schwelle, mit der die Konturpunkte für den Kreisfit gewonnen werden." },
      { key: "thickness", label: "Linienstärke", type: "range", default: 3, min: 1, max: 12, step: 1, help: "Stärke des eingezeichneten Kreises in Pixeln." },
    ],
    process: (src, params) => processCircleFit(src, params, false),
  },
  circleRobust: {
    name: "Kreisfit + Ausreißer",
    short: "RANSAC",
    description: "Robuster Kreisfit mit RANSAC",
    params: [
      { key: "minPoints", label: "Min. Konturpunkte", type: "range", default: 30, min: 3, max: 500, step: 1, help: "Konturen mit weniger Punkten werden ignoriert, bevor die robuste Schätzung beginnt." },
      { key: "tolerance", label: "Ausreißer-Toleranz", type: "range", default: 3, min: 0.5, max: 20, step: 0.5, unit: " px", help: "Maximaler radialer Abstand eines Konturpunkts vom Kreis, damit er als Inlier zählt." },
      { key: "iterations", label: "RANSAC-Runden", type: "range", default: 200, min: 20, max: 1000, step: 20, help: "Anzahl zufälliger Kreis-Hypothesen. Mehr Runden erhöhen Robustheit und Rechenzeit." },
      { key: "minRatio", label: "Min. Inlier-Anteil", type: "range", default: 0.55, min: 0.1, max: 1, step: 0.05, help: "Mindestanteil passender Konturpunkte. Liegt die beste Hypothese darunter, wird kein Kreis gezeichnet." },
      { key: "thickness", label: "Linienstärke", type: "range", default: 3, min: 1, max: 12, step: 1, help: "Stärke des eingezeichneten Kreises in Pixeln." },
    ],
    process: (src, params) => processCircleFit(src, params, true),
  },
};

const state = {
  cvReady: false,
  sourceMode: "camera",
  stream: null,
  videoUrl: null,
  live: false,
  animationId: 0,
  lastFrameAt: 0,
  hasFrame: false,
  processing: false,
  draggedInstance: null,
  pipeline: [],
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const elements = {
  runtimeStatus: $("#runtimeStatus"),
  originalCanvas: $("#originalCanvas"),
  resultCanvas: $("#resultCanvas"),
  originalEmpty: $("#originalEmpty"),
  resultEmpty: $("#resultEmpty"),
  resolutionLabel: $("#resolutionLabel"),
  processingTime: $("#processingTime"),
  blockPalette: $("#blockPalette"),
  pipelineList: $("#pipelineList"),
  pipelineDropzone: $("#pipelineDropzone"),
  blockCount: $("#blockCount"),
  clearPipeline: $("#clearPipeline"),
  runPipeline: $("#runPipeline"),
  cameraActions: $("#cameraActions"),
  videoActions: $("#videoActions"),
  cameraSelect: $("#cameraSelect"),
  startCamera: $("#startCamera"),
  takeSnapshot: $("#takeSnapshot"),
  toggleLive: $("#toggleLive"),
  videoFile: $("#videoFile"),
  mediaVideo: $("#mediaVideo"),
  sourceMessage: $("#sourceMessage"),
  toastRegion: $("#toastRegion"),
};

function makeInstance(type) {
  const config = BLOCKS[type];
  return {
    id: crypto.randomUUID(),
    type,
    enabled: true,
    params: Object.fromEntries(config.params.map((param) => [param.key, param.default])),
  };
}

function initialise() {
  renderPalette();
  state.pipeline = [makeInstance("grayscale"), makeInstance("threshold"), makeInstance("canny")];
  renderPipeline();
  bindSourceControls();
  bindPipelineControls();
  detectOpenCv();
}

function renderPalette() {
  elements.blockPalette.innerHTML = Object.entries(BLOCKS).map(([type, block]) => `
    <div class="palette-block" draggable="true" data-block-type="${type}" role="button" tabindex="0" aria-label="${block.name} hinzufügen">
      <span class="block-symbol">${block.short}</span>
      <span><strong>${block.name}</strong><small>${block.description}</small></span>
      <span class="drag-grip" aria-hidden="true"></span>
    </div>
  `).join("");

  $$(".palette-block", elements.blockPalette).forEach((item) => {
    item.addEventListener("dragstart", (event) => {
      state.draggedInstance = null;
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData("application/x-pipeline-block", item.dataset.blockType);
    });
    item.addEventListener("click", () => addBlock(item.dataset.blockType));
    item.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        addBlock(item.dataset.blockType);
      }
    });
  });
}

function addBlock(type, index = state.pipeline.length) {
  if (!BLOCKS[type]) return;
  state.pipeline.splice(index, 0, makeInstance(type));
  renderPipeline();
  scheduleProcessing();
}

function renderPipeline() {
  elements.pipelineList.innerHTML = state.pipeline.map((instance, index) => {
    const block = BLOCKS[instance.type];
    const parameterControls = block.params.map((param) => renderParameter(instance, param)).join("");
    return `
      <article class="unit-card process-unit ${instance.enabled ? "" : "is-disabled"}" draggable="true" data-instance-id="${instance.id}">
        <div class="unit-number">${String(index + 2).padStart(2, "0")}</div>
        <div class="unit-main">
          <div class="unit-head">
            <div class="unit-icon">${block.short}</div>
            <div><span class="unit-kicker">Funktions-Unit</span><h3>${block.name}</h3></div>
            <div class="unit-actions">
              <label class="toggle" title="Baustein ein- oder ausschalten">
                <input type="checkbox" data-action="toggle" ${instance.enabled ? "checked" : ""} aria-label="${block.name} aktivieren" />
                <span></span>
              </label>
              <button class="icon-button mini-grip" data-action="drag" type="button" title="Zum Verschieben ziehen" aria-label="Baustein verschieben">⠿</button>
              <button class="icon-button remove" data-action="remove" type="button" title="Entfernen" aria-label="Baustein entfernen">×</button>
            </div>
          </div>
          <div class="params-and-preview">
            <div class="parameter-grid">${parameterControls || "<span class=\"source-message\">Keine Parameter</span>"}</div>
            <div class="step-preview">
              <canvas id="preview-${instance.id}" width="320" height="180"></canvas>
              <span>Ausgabe dieser Unit</span>
            </div>
          </div>
        </div>
      </article>
    `;
  }).join("");

  const total = state.pipeline.length + 1;
  elements.blockCount.textContent = `${total} ${total === 1 ? "Einheit" : "Einheiten"}`;
  attachCardEvents();
}

function renderParameter(instance, param) {
  const value = instance.params[param.key];
  const heading = `<div class="param-heading" data-tooltip="${param.help}"><span class="param-label">${param.label}</span><span class="help-dot">?</span></div>`;
  if (param.type === "range") {
    return `<label class="parameter-control">${heading}<span class="range-row"><input type="range" data-param="${param.key}" min="${param.min}" max="${param.max}" step="${param.step}" value="${value}" /><output class="range-value">${formatValue(value, param)}</output></span></label>`;
  }
  if (param.type === "select") {
    const options = param.options.map(([optionValue, label]) => `<option value="${optionValue}" ${String(value) === String(optionValue) ? "selected" : ""}>${label}</option>`).join("");
    return `<label class="parameter-control">${heading}<select data-param="${param.key}">${options}</select></label>`;
  }
  return `<label class="parameter-control">${heading}<span class="checkbox-row"><input type="checkbox" data-param="${param.key}" ${value ? "checked" : ""} /> Aktiv</span></label>`;
}

function formatValue(value, param) {
  const number = Number(value);
  const formatted = Number.isInteger(number) ? number : number.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return `${formatted}${param.unit || ""}`;
}

function attachCardEvents() {
  $$(".process-unit", elements.pipelineList).forEach((card) => {
    const instance = state.pipeline.find((item) => item.id === card.dataset.instanceId);
    card.addEventListener("dragstart", (event) => {
      state.draggedInstance = instance.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("application/x-pipeline-instance", instance.id);
      requestAnimationFrame(() => card.classList.add("is-dragging"));
    });
    card.addEventListener("dragend", () => {
      state.draggedInstance = null;
      card.classList.remove("is-dragging");
      $$(".drop-before").forEach((item) => item.classList.remove("drop-before"));
    });
    card.addEventListener("dragover", (event) => {
      event.preventDefault();
      card.classList.add("drop-before");
    });
    card.addEventListener("dragleave", () => card.classList.remove("drop-before"));
    card.addEventListener("drop", (event) => {
      event.preventDefault();
      card.classList.remove("drop-before");
      const targetIndex = state.pipeline.findIndex((item) => item.id === instance.id);
      handleDrop(event, targetIndex);
    });

    $("[data-action='remove']", card).addEventListener("click", () => {
      state.pipeline = state.pipeline.filter((item) => item.id !== instance.id);
      renderPipeline();
      scheduleProcessing();
    });
    $("[data-action='toggle']", card).addEventListener("change", (event) => {
      instance.enabled = event.target.checked;
      card.classList.toggle("is-disabled", !instance.enabled);
      scheduleProcessing();
    });
    $$('[data-param]', card).forEach((control) => {
      control.addEventListener("input", () => {
        const definition = BLOCKS[instance.type].params.find((param) => param.key === control.dataset.param);
        instance.params[definition.key] = definition.type === "checkbox" ? control.checked : definition.type === "select" && typeof definition.default === "string" ? control.value : Number(control.value);
        const output = control.closest(".range-row")?.querySelector("output");
        if (output) output.value = formatValue(instance.params[definition.key], definition);
        scheduleProcessing();
      });
    });
  });
}

function bindPipelineControls() {
  elements.pipelineDropzone.addEventListener("dragover", (event) => {
    event.preventDefault();
    elements.pipelineDropzone.classList.add("is-over");
  });
  elements.pipelineDropzone.addEventListener("dragleave", () => elements.pipelineDropzone.classList.remove("is-over"));
  elements.pipelineDropzone.addEventListener("drop", (event) => {
    event.preventDefault();
    elements.pipelineDropzone.classList.remove("is-over");
    handleDrop(event, state.pipeline.length);
  });
  elements.runPipeline.addEventListener("click", processPipeline);
  elements.clearPipeline.addEventListener("click", () => {
    state.pipeline = [];
    renderPipeline();
    scheduleProcessing();
  });
}

function handleDrop(event, targetIndex) {
  const type = event.dataTransfer.getData("application/x-pipeline-block");
  if (type) {
    addBlock(type, targetIndex);
    return;
  }
  const id = event.dataTransfer.getData("application/x-pipeline-instance") || state.draggedInstance;
  const sourceIndex = state.pipeline.findIndex((item) => item.id === id);
  if (sourceIndex < 0) return;
  const [moved] = state.pipeline.splice(sourceIndex, 1);
  const adjustedIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
  state.pipeline.splice(adjustedIndex, 0, moved);
  renderPipeline();
  scheduleProcessing();
}

function bindSourceControls() {
  $$("[data-source]").forEach((button) => button.addEventListener("click", () => switchSource(button.dataset.source)));
  elements.startCamera.addEventListener("click", startCamera);
  elements.takeSnapshot.addEventListener("click", () => {
    drawSourceFrame();
    processPipeline();
  });
  elements.toggleLive.addEventListener("click", () => setLive(!state.live));
  elements.videoFile.addEventListener("change", loadVideoFile);
  elements.mediaVideo.addEventListener("ended", () => setLive(false));
  window.addEventListener("beforeunload", stopMedia);
}

function switchSource(mode) {
  if (state.sourceMode === mode) return;
  state.sourceMode = mode;
  $$("[data-source]").forEach((button) => button.classList.toggle("is-active", button.dataset.source === mode));
  elements.cameraActions.classList.toggle("is-hidden", mode !== "camera");
  elements.videoActions.classList.toggle("is-hidden", mode !== "video");
  stopMedia();
  setSourceMessage(mode === "camera" ? "Die Kamera benötigt Zugriff über localhost oder HTTPS." : "Wähle ein lokales Video. Es wird ausschließlich im Browser verarbeitet.");
}

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    setSourceMessage("Dieser Browser unterstützt keinen Kamerazugriff.", true);
    return;
  }
  try {
    stopMedia();
    setSourceMessage("Kamerazugriff wird angefragt …");
    const deviceId = elements.cameraSelect.value;
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: deviceId ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
    });
    elements.mediaVideo.src = "";
    elements.mediaVideo.srcObject = state.stream;
    await elements.mediaVideo.play();
    elements.takeSnapshot.disabled = false;
    elements.toggleLive.disabled = false;
    elements.startCamera.textContent = "Kamera wechseln";
    await updateCameraList();
    drawSourceFrame();
    await processPipeline();
    setSourceMessage("Kamera bereit. Einzelbild aufnehmen oder Livestream aktivieren.");
  } catch (error) {
    setSourceMessage(cameraErrorMessage(error), true);
    showToast(cameraErrorMessage(error), true);
  }
}

async function updateCameraList() {
  const devices = await navigator.mediaDevices.enumerateDevices();
  const cameras = devices.filter((device) => device.kind === "videoinput");
  const selected = elements.cameraSelect.value;
  elements.cameraSelect.innerHTML = cameras.map((camera, index) => `<option value="${camera.deviceId}">${camera.label || `Kamera ${index + 1}`}</option>`).join("") || '<option value="">Standardkamera</option>';
  if (cameras.some((camera) => camera.deviceId === selected)) elements.cameraSelect.value = selected;
}

function cameraErrorMessage(error) {
  if (error?.name === "NotAllowedError") return "Kamerazugriff wurde abgelehnt. Bitte Browser-Berechtigung prüfen.";
  if (error?.name === "NotFoundError") return "Keine Kamera gefunden.";
  if (error?.name === "NotReadableError") return "Die Kamera wird bereits von einer anderen Anwendung verwendet.";
  return "Die Kamera konnte nicht gestartet werden.";
}

async function loadVideoFile(event) {
  const [file] = event.target.files;
  if (!file) return;
  stopMedia();
  state.videoUrl = URL.createObjectURL(file);
  elements.mediaVideo.srcObject = null;
  elements.mediaVideo.src = state.videoUrl;
  try {
    await elements.mediaVideo.play();
    setSourceMessage(`${file.name} wird verarbeitet.`);
    setLive(true);
  } catch {
    setSourceMessage("Das Videoformat konnte nicht abgespielt werden.", true);
  }
}

function stopMedia() {
  setLive(false);
  state.stream?.getTracks().forEach((track) => track.stop());
  state.stream = null;
  elements.mediaVideo.pause();
  elements.mediaVideo.srcObject = null;
  if (state.videoUrl) URL.revokeObjectURL(state.videoUrl);
  state.videoUrl = null;
  elements.takeSnapshot.disabled = true;
  elements.toggleLive.disabled = true;
  elements.startCamera.textContent = "Kamera starten";
}

function setLive(active) {
  state.live = active;
  elements.toggleLive.classList.toggle("is-active", active);
  elements.toggleLive.innerHTML = `<span class="record-dot"></span> ${active ? "Live stoppen" : "Livestream"}`;
  cancelAnimationFrame(state.animationId);
  if (active) state.animationId = requestAnimationFrame(frameLoop);
}

function frameLoop(timestamp) {
  if (!state.live) return;
  if (!state.processing && timestamp - state.lastFrameAt > 70 && elements.mediaVideo.readyState >= 2) {
    state.lastFrameAt = timestamp;
    drawSourceFrame();
    processPipeline();
  }
  state.animationId = requestAnimationFrame(frameLoop);
}

function drawSourceFrame() {
  const video = elements.mediaVideo;
  if (!video.videoWidth || !video.videoHeight) return;
  const canvas = elements.originalCanvas;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    elements.resultCanvas.width = video.videoWidth;
    elements.resultCanvas.height = video.videoHeight;
  }
  canvas.getContext("2d", { willReadFrequently: true }).drawImage(video, 0, 0, canvas.width, canvas.height);
  state.hasFrame = true;
  elements.originalEmpty.classList.add("is-hidden");
  elements.resolutionLabel.textContent = `${canvas.width} × ${canvas.height} px`;
  updateRunButton();
}

let processTimer;
function scheduleProcessing() {
  clearTimeout(processTimer);
  processTimer = setTimeout(processPipeline, 90);
}

async function processPipeline() {
  if (!state.cvReady || !state.hasFrame || state.processing) return;
  state.processing = true;
  updateRunButton();
  const started = performance.now();
  let current;
  try {
    current = cv.imread(elements.originalCanvas);
    for (const instance of state.pipeline) {
      let next;
      if (instance.enabled) next = BLOCKS[instance.type].process(current, instance.params);
      else next = current.clone();
      current.delete();
      current = next;
      const stepCanvas = document.getElementById(`preview-${instance.id}`);
      if (stepCanvas) cv.imshow(stepCanvas, current);
    }
    cv.imshow(elements.resultCanvas, current);
    elements.resultEmpty.classList.add("is-hidden");
    elements.processingTime.textContent = `${Math.round(performance.now() - started)} ms`;
  } catch (error) {
    console.error(error);
    showToast(`Verarbeitung fehlgeschlagen: ${error.message || error}`, true);
  } finally {
    current?.delete();
    state.processing = false;
    updateRunButton();
  }
}

function processGrayscale(src, params) {
  if (params.mode === "luma") return toGray(src);
  const rgba = toRgba(src);
  const channels = new cv.MatVector();
  cv.split(rgba, channels);
  const channelIndex = { red: 0, green: 1, blue: 2 }[params.mode] ?? 0;
  const selected = channels.get(channelIndex);
  const result = selected.clone();
  selected.delete();
  channels.delete();
  rgba.delete();
  return result;
}

function processThreshold(src, params) {
  const gray = toGray(src);
  const dst = new cv.Mat();
  const typeMap = {
    binary: cv.THRESH_BINARY,
    binaryInv: cv.THRESH_BINARY_INV,
    truncate: cv.THRESH_TRUNC,
    toZero: cv.THRESH_TOZERO,
    otsu: cv.THRESH_BINARY | cv.THRESH_OTSU,
  };
  cv.threshold(gray, dst, params.threshold, params.maxValue, typeMap[params.type]);
  gray.delete();
  return dst;
}

function processCanny(src, params) {
  const gray = toGray(src);
  const dst = new cv.Mat();
  const low = Math.min(params.low, params.high);
  const high = Math.max(params.low, params.high);
  cv.Canny(gray, dst, low, high, Number(params.aperture), Boolean(params.l2));
  gray.delete();
  return dst;
}

function processCircleFit(src, params, robust) {
  const gray = toGray(src);
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT);
  cv.Canny(blurred, edges, Number(params.edgeLow ?? 50), Math.max(100, Number(params.edgeLow ?? 50) * 3));

  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();
  cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_NONE);
  let points = [];
  for (let index = 0; index < contours.size(); index += 1) {
    const contour = contours.get(index);
    if (contour.rows >= Number(params.minPoints) && contour.rows > points.length) {
      points = [];
      for (let pointIndex = 0; pointIndex < contour.data32S.length; pointIndex += 2) {
        points.push({ x: contour.data32S[pointIndex], y: contour.data32S[pointIndex + 1] });
      }
    }
    contour.delete();
  }

  if (points.length > 1600) {
    const stride = Math.ceil(points.length / 1600);
    points = points.filter((_, index) => index % stride === 0);
  }
  const circle = robust
    ? fitCircleRansac(points, Number(params.tolerance), Number(params.iterations), Number(params.minRatio))
    : fitCircleLeastSquares(points);
  const result = toRgba(src);
  if (circle && Number.isFinite(circle.r) && circle.r > 1) {
    cv.circle(result, new cv.Point(Math.round(circle.x), Math.round(circle.y)), Math.round(circle.r), new cv.Scalar(200, 255, 74, 255), Number(params.thickness), cv.LINE_AA);
    cv.circle(result, new cv.Point(Math.round(circle.x), Math.round(circle.y)), 3, new cv.Scalar(69, 222, 199, 255), -1, cv.LINE_AA);
  }
  gray.delete();
  blurred.delete();
  edges.delete();
  contours.delete();
  hierarchy.delete();
  return result;
}

function toGray(src) {
  if (src.channels() === 1) return src.clone();
  const dst = new cv.Mat();
  cv.cvtColor(src, dst, src.channels() === 4 ? cv.COLOR_RGBA2GRAY : cv.COLOR_RGB2GRAY);
  return dst;
}

function toRgba(src) {
  if (src.channels() === 4) return src.clone();
  const dst = new cv.Mat();
  if (src.channels() === 1) cv.cvtColor(src, dst, cv.COLOR_GRAY2RGBA);
  else cv.cvtColor(src, dst, cv.COLOR_RGB2RGBA);
  return dst;
}

function fitCircleLeastSquares(points) {
  if (points.length < 3) return null;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;
  let suu = 0, svv = 0, suv = 0, suuu = 0, svvv = 0, suvv = 0, svuu = 0;
  for (const point of points) {
    const u = point.x - meanX;
    const v = point.y - meanY;
    const uu = u * u;
    const vv = v * v;
    suu += uu; svv += vv; suv += u * v;
    suuu += uu * u; svvv += vv * v; suvv += u * vv; svuu += v * uu;
  }
  const determinant = 4 * (suu * svv - suv * suv);
  if (Math.abs(determinant) < 1e-9) return null;
  const rhsU = suuu + suvv;
  const rhsV = svvv + svuu;
  const uc = (2 * svv * rhsU - 2 * suv * rhsV) / determinant;
  const vc = (2 * suu * rhsV - 2 * suv * rhsU) / determinant;
  return { x: meanX + uc, y: meanY + vc, r: Math.sqrt(uc * uc + vc * vc + (suu + svv) / points.length) };
}

function fitCircleRansac(points, tolerance, iterations, minRatio) {
  if (points.length < 3) return null;
  let bestInliers = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const sample = randomDistinctPoints(points, 3);
    const candidate = circleFromThreePoints(sample[0], sample[1], sample[2]);
    if (!candidate) continue;
    const inliers = points.filter((point) => Math.abs(Math.hypot(point.x - candidate.x, point.y - candidate.y) - candidate.r) <= tolerance);
    if (inliers.length > bestInliers.length) bestInliers = inliers;
  }
  if (bestInliers.length / points.length < minRatio) return null;
  return fitCircleLeastSquares(bestInliers);
}

function randomDistinctPoints(points, count) {
  const indices = new Set();
  while (indices.size < count) indices.add(Math.floor(Math.random() * points.length));
  return [...indices].map((index) => points[index]);
}

function circleFromThreePoints(a, b, c) {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  const aa = a.x * a.x + a.y * a.y;
  const bb = b.x * b.x + b.y * b.y;
  const cc = c.x * c.x + c.y * c.y;
  const x = (aa * (b.y - c.y) + bb * (c.y - a.y) + cc * (a.y - b.y)) / d;
  const y = (aa * (c.x - b.x) + bb * (a.x - c.x) + cc * (b.x - a.x)) / d;
  return { x, y, r: Math.hypot(a.x - x, a.y - y) };
}

function detectOpenCv() {
  const markReady = () => {
    if (state.cvReady || !window.cv?.Mat) return;
    state.cvReady = true;
    elements.runtimeStatus.innerHTML = '<span class="status-dot is-ready"></span><span>OpenCV bereit</span>';
    updateRunButton();
    showToast("OpenCV ist bereit.");
  };
  window.addEventListener("opencv-ready", markReady, { once: true });
  const timer = setInterval(() => {
    markReady();
    if (state.cvReady) clearInterval(timer);
  }, 250);
  setTimeout(() => {
    if (state.cvReady) return;
    elements.runtimeStatus.innerHTML = '<span class="status-dot is-error"></span><span>OpenCV nicht geladen</span>';
    showToast("OpenCV.js konnte nicht geladen werden. Lokale Datei prüfen und neu laden.", true);
  }, 15000);
}

function updateRunButton() {
  elements.runPipeline.disabled = !state.cvReady || !state.hasFrame || state.processing;
  elements.runPipeline.lastChild.textContent = state.processing ? " Verarbeitet …" : " Verarbeiten";
}

function setSourceMessage(message, error = false) {
  elements.sourceMessage.textContent = message;
  elements.sourceMessage.classList.toggle("is-error", error);
}

function showToast(message, error = false) {
  const toast = document.createElement("div");
  toast.className = `toast ${error ? "is-error" : ""}`;
  toast.textContent = message;
  elements.toastRegion.append(toast);
  setTimeout(() => toast.remove(), 4200);
}

initialise();
