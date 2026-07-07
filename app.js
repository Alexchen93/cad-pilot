const svg = document.querySelector("#drawing");
const entitiesLayer = document.querySelector("#entities");
const previewLayer = document.querySelector("#preview");
const selectionLayer = document.querySelector("#selection");
const commandForm = document.querySelector("#command-form");
const commandInput = document.querySelector("#command-input");
const commandHistory = document.querySelector("#command-history");
const dynamicInput = document.querySelector("#dynamic-input");
const activeToolEl = document.querySelector("#active-tool");
const cursorReadout = document.querySelector("#cursor-readout");
const snapState = document.querySelector("#snap-state");
const snapToggle = document.querySelector("#snap-toggle");
const orthoToggle = document.querySelector("#ortho-toggle");
const snapSizeInput = document.querySelector("#snap-size");
const layerSelect = document.querySelector("#layer-select");
const selectionInfo = document.querySelector("#selection-info");
const svgImportInput = document.querySelector("#svg-import-input");
const languageSelect = document.querySelector("#language-select");

const SVG_NS = "http://www.w3.org/2000/svg";
const translations = {
  en: {
    applicationMenu: "Application menu",
    file: "File",
    importSvg: "Import SVG",
    exportSvg: "Export SVG",
    tagline: "AutoCAD-style drafting prototype",
    language: "Language",
    drawingTools: "Drawing tools",
    select: "Select",
    line: "Line",
    polyline: "Polyline",
    rectangle: "Rectangle",
    circle: "Circle",
    dimension: "Dimension",
    canvas: "CAD drawing canvas",
    layers: "Layers",
    currentLayer: "Current layer",
    draftingAids: "Drafting Aids",
    snap: "Snap",
    ortho: "Ortho",
    snapSpacing: "Snap spacing",
    selection: "Selection",
    noSelection: "No entity selected.",
    selectedEntity: "{type} on {layer}",
    copy: "Copy",
    move: "Move",
    erase: "Erase",
    undo: "Undo",
    commands: "Commands",
    commandLabel: "Command:",
    commandPlaceholder: "Type LINE, RECT, CIRCLE, DIM, IMPORTSVG, EXPORTSVG...",
    snapOn: "SNAP ON",
    snapOff: "SNAP OFF",
    command: "Command: {command}",
    nothingSelected: "Nothing selected.",
    specifyMovePoints: "Specify base point, then destination point.",
    specifyDestination: "Specify destination point.",
    nothingToUndo: "Nothing to undo.",
    exportTitle: "CadPilot Export",
    exportedSvg: "Exported SVG: {count} entities.",
    importInvalid: "Import failed: invalid SVG.",
    importEmpty: "Import found no supported SVG entities.",
    importedSvg: "Imported {count} entities from {file}.",
    unknownCommand: "Unknown command.",
    cancel: "Cancel",
    ready: "Ready. Use toolbar or command aliases: L, PL, RECT, C, DIM, IMPORTSVG, EXPORTSVG.",
  },
  "zh-Hant": {
    applicationMenu: "應用程式選單",
    file: "檔案",
    importSvg: "匯入 SVG",
    exportSvg: "匯出 SVG",
    tagline: "AutoCAD 風格的繪圖原型",
    language: "語言",
    drawingTools: "繪圖工具",
    select: "選取",
    line: "直線",
    polyline: "聚合線",
    rectangle: "矩形",
    circle: "圓",
    dimension: "標註",
    canvas: "CAD 繪圖畫布",
    layers: "圖層",
    currentLayer: "目前圖層",
    draftingAids: "繪圖輔助",
    snap: "鎖點",
    ortho: "正交",
    snapSpacing: "鎖點間距",
    selection: "選取",
    noSelection: "尚未選取圖元。",
    selectedEntity: "{type} 位於 {layer}",
    copy: "複製",
    move: "移動",
    erase: "刪除",
    undo: "復原",
    commands: "命令",
    commandLabel: "命令：",
    commandPlaceholder: "輸入 LINE、RECT、CIRCLE、DIM、IMPORTSVG、EXPORTSVG...",
    snapOn: "鎖點 開",
    snapOff: "鎖點 關",
    command: "命令：{command}",
    nothingSelected: "尚未選取任何圖元。",
    specifyMovePoints: "請指定基準點，接著指定目標點。",
    specifyDestination: "請指定目標點。",
    nothingToUndo: "沒有可復原的動作。",
    exportTitle: "CadPilot 匯出",
    exportedSvg: "已匯出 SVG：{count} 個圖元。",
    importInvalid: "匯入失敗：SVG 格式無效。",
    importEmpty: "匯入檔案中沒有支援的 SVG 圖元。",
    importedSvg: "已從 {file} 匯入 {count} 個圖元。",
    unknownCommand: "未知的命令。",
    cancel: "取消",
    ready: "就緒。可使用工具列或命令別名：L、PL、RECT、C、DIM、IMPORTSVG、EXPORTSVG。",
  },
};

let currentLanguage = localStorage.getItem("cadpilot-language") || "zh-Hant";

function t(key, values = {}) {
  const template = translations[currentLanguage]?.[key] || translations.en[key] || key;
  return template.replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : "zh-Hant";
  localStorage.setItem("cadpilot-language", currentLanguage);
  document.documentElement.lang = currentLanguage;
  if (languageSelect) languageSelect.value = currentLanguage;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.title = t(node.dataset.i18nTitle);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
  updateSnapState();
  render();
}

const layerColors = {
  "0": "#88f7ff",
  "A-WALL": "#f5f7a1",
  "A-DOOR": "#ff9f7c",
  "E-LIGHT": "#75d66b",
  "M-PIPE": "#64a7ff",
  "DIM": "#32d296",
};

let state = {
  tool: "line",
  points: [],
  entities: [],
  selectedId: null,
  copyBuffer: null,
  moving: null,
  undoStack: [],
};

function makeId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `ent-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function log(message) {
  const line = document.createElement("div");
  line.textContent = message;
  commandHistory.appendChild(line);
  commandHistory.scrollTop = commandHistory.scrollHeight;
}

function setTool(tool) {
  state.tool = tool;
  state.points = [];
  state.moving = null;
  previewLayer.replaceChildren();
  activeToolEl.textContent = tool.toUpperCase();
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  log(t("command", { command: tool.toUpperCase() }));
}

function screenToSvgPoint(event) {
  const pt = svg.createSVGPoint();
  pt.x = event.clientX;
  pt.y = event.clientY;
  const raw = pt.matrixTransform(svg.getScreenCTM().inverse());
  let x = raw.x;
  let y = raw.y;
  if (snapToggle.checked) {
    const spacing = Number(snapSizeInput.value) || 20;
    x = Math.round(x / spacing) * spacing;
    y = Math.round(y / spacing) * spacing;
  }
  const last = state.points[state.points.length - 1];
  if (orthoToggle.checked && last) {
    if (Math.abs(x - last.x) > Math.abs(y - last.y)) y = last.y;
    else x = last.x;
  }
  return { x, y };
}

function distance(a, b) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function midpoint(a, b) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function createSvg(name, attrs = {}) {
  const node = document.createElementNS(SVG_NS, name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, value));
  return node;
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function layerFromStroke(stroke) {
  if (!stroke) return layerSelect.value;
  const normalized = stroke.trim().toLowerCase();
  const found = Object.entries(layerColors).find(([, color]) => color.toLowerCase() === normalized);
  return found ? found[0] : layerSelect.value;
}

function snapshot() {
  state.undoStack.push(JSON.stringify(state.entities));
  if (state.undoStack.length > 80) state.undoStack.shift();
}

function addEntity(entity) {
  snapshot();
  state.entities.push({
    id: makeId(),
    layer: layerSelect.value,
    ...entity,
  });
  render();
}

function entityBounds(entity) {
  const pts = entity.points || [];
  if (entity.type === "circle") {
    return {
      minX: entity.cx - entity.r,
      maxX: entity.cx + entity.r,
      minY: entity.cy - entity.r,
      maxY: entity.cy + entity.r,
    };
  }
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
}

function renderEntity(entity) {
  const color = layerColors[entity.layer] || layerColors["0"];
  let node;
  if (entity.type === "line" || entity.type === "dimension") {
    const [a, b] = entity.points;
    node = createSvg("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y });
  } else if (entity.type === "polyline") {
    node = createSvg("polyline", { points: entity.points.map((p) => `${p.x},${p.y}`).join(" ") });
  } else if (entity.type === "rect") {
    const [a, b] = entity.points;
    node = createSvg("rect", {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(b.x - a.x),
      height: Math.abs(b.y - a.y),
    });
  } else if (entity.type === "circle") {
    node = createSvg("circle", { cx: entity.cx, cy: entity.cy, r: entity.r });
  }
  node.classList.add("entity");
  if (entity.type === "dimension") node.classList.add("entity-dim");
  if (entity.id === state.selectedId) node.classList.add("selected");
  node.dataset.id = entity.id;
  node.dataset.cadType = entity.type;
  node.dataset.layer = entity.layer;
  node.style.stroke = entity.type === "dimension" ? layerColors.DIM : color;
  return node;
}

function renderDimensionText(entity) {
  const [a, b] = entity.points;
  const mid = midpoint(a, b);
  const text = createSvg("text", { x: mid.x + 8, y: mid.y - 8, class: "dim-text" });
  text.textContent = distance(a, b).toFixed(2);
  return text;
}

function render() {
  entitiesLayer.replaceChildren();
  selectionLayer.replaceChildren();
  state.entities.forEach((entity) => {
    const node = renderEntity(entity);
    entitiesLayer.appendChild(node);
    if (entity.type === "dimension") {
      entitiesLayer.appendChild(renderDimensionText(entity));
    }
  });
  const selected = state.entities.find((item) => item.id === state.selectedId);
  if (selected) {
    const bounds = entityBounds(selected);
    selectionLayer.appendChild(createSvg("rect", {
      x: bounds.minX - 6,
      y: bounds.minY - 6,
      width: bounds.maxX - bounds.minX + 12,
      height: bounds.maxY - bounds.minY + 12,
      class: "preview-line",
    }));
    selectionInfo.textContent = t("selectedEntity", { type: selected.type.toUpperCase(), layer: selected.layer });
  } else {
    selectionInfo.textContent = t("noSelection");
  }
}

function preview(point) {
  previewLayer.replaceChildren();
  const first = state.points[0];
  if (!first) return;
  if (state.tool === "line" || state.tool === "dimension") {
    previewLayer.appendChild(createSvg("line", {
      x1: first.x,
      y1: first.y,
      x2: point.x,
      y2: point.y,
      class: "preview-line",
    }));
  }
  if (state.tool === "rect") {
    previewLayer.appendChild(createSvg("rect", {
      x: Math.min(first.x, point.x),
      y: Math.min(first.y, point.y),
      width: Math.abs(point.x - first.x),
      height: Math.abs(point.y - first.y),
      class: "preview-line",
    }));
  }
  if (state.tool === "circle") {
    previewLayer.appendChild(createSvg("circle", {
      cx: first.x,
      cy: first.y,
      r: distance(first, point),
      class: "preview-line",
    }));
  }
  if (state.tool === "polyline" && state.points.length) {
    const all = [...state.points, point];
    previewLayer.appendChild(createSvg("polyline", {
      points: all.map((p) => `${p.x},${p.y}`).join(" "),
      class: "preview-line",
    }));
  }
}

function finishPoint(point) {
  if (state.tool === "select") return;
  state.points.push(point);
  if (state.tool === "line" && state.points.length === 2) {
    addEntity({ type: "line", points: [...state.points] });
    state.points = [];
  }
  if (state.tool === "dimension" && state.points.length === 2) {
    addEntity({ type: "dimension", layer: "DIM", points: [...state.points] });
    state.points = [];
  }
  if (state.tool === "rect" && state.points.length === 2) {
    addEntity({ type: "rect", points: [...state.points] });
    state.points = [];
  }
  if (state.tool === "circle" && state.points.length === 2) {
    addEntity({ type: "circle", cx: state.points[0].x, cy: state.points[0].y, r: distance(state.points[0], state.points[1]) });
    state.points = [];
  }
  previewLayer.replaceChildren();
}

function selectEntity(id) {
  state.selectedId = id;
  render();
}

function eraseSelected() {
  if (!state.selectedId) return log(t("nothingSelected"));
  snapshot();
  state.entities = state.entities.filter((entity) => entity.id !== state.selectedId);
  state.selectedId = null;
  render();
}

function cloneEntity(entity, dx = 40, dy = 40) {
  const cloned = structuredClone(entity);
  cloned.id = makeId();
  if (cloned.points) cloned.points = cloned.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
  if (cloned.type === "circle") {
    cloned.cx += dx;
    cloned.cy += dy;
  }
  return cloned;
}

function copySelected() {
  const selected = state.entities.find((entity) => entity.id === state.selectedId);
  if (!selected) return log(t("nothingSelected"));
  snapshot();
  const cloned = cloneEntity(selected);
  state.entities.push(cloned);
  state.selectedId = cloned.id;
  render();
}

function moveSelected() {
  const selected = state.entities.find((entity) => entity.id === state.selectedId);
  if (!selected) return log(t("nothingSelected"));
  state.moving = { id: selected.id, base: null };
  log(t("specifyMovePoints"));
}

function moveEntity(id, from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  snapshot();
  state.entities = state.entities.map((entity) => {
    if (entity.id !== id) return entity;
    const moved = structuredClone(entity);
    if (moved.points) moved.points = moved.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
    if (moved.type === "circle") {
      moved.cx += dx;
      moved.cy += dy;
    }
    return moved;
  });
  render();
}

function undo() {
  const previous = state.undoStack.pop();
  if (!previous) return log(t("nothingToUndo"));
  state.entities = JSON.parse(previous);
  state.selectedId = null;
  render();
}

function buildExportSvg() {
  const exported = createSvg("svg", {
    xmlns: SVG_NS,
    width: "1600",
    height: "900",
    viewBox: "0 0 1600 900",
  });
  const title = createSvg("title");
  title.textContent = t("exportTitle");
  const style = createSvg("style");
  style.textContent = `
    .entity { fill: none; stroke-width: 2.2; vector-effect: non-scaling-stroke; }
    .entity-dim { stroke: ${layerColors.DIM}; }
    .dim-text { fill: ${layerColors.DIM}; font: 18px sans-serif; }
  `;
  exported.append(title, style);
  state.entities.forEach((entity) => {
    const node = renderEntity(entity);
    node.classList.remove("selected");
    node.removeAttribute("data-id");
    exported.appendChild(node);
    if (entity.type === "dimension") exported.appendChild(renderDimensionText(entity));
  });
  return exported;
}

function exportSvg() {
  const exported = buildExportSvg();
  const source = new XMLSerializer().serializeToString(exported);
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${source}\n`], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const link = document.createElement("a");
  link.href = url;
  link.download = `cadpilot-${stamp}.svg`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  log(t("exportedSvg", { count: state.entities.length }));
}

function entityFromSvgNode(node) {
  const tag = node.localName;
  const layer = node.dataset.layer || layerFromStroke(node.getAttribute("stroke") || node.style.stroke);
  const typeHint = node.dataset.cadType;
  if (tag === "line") {
    return {
      type: typeHint === "dimension" ? "dimension" : "line",
      layer,
      points: [
        { x: toNumber(node.getAttribute("x1")), y: toNumber(node.getAttribute("y1")) },
        { x: toNumber(node.getAttribute("x2")), y: toNumber(node.getAttribute("y2")) },
      ],
    };
  }
  if (tag === "polyline") {
    const points = (node.getAttribute("points") || "")
      .trim()
      .split(/\s+/)
      .map((pair) => {
        const [x, y] = pair.split(",").map((value) => toNumber(value));
        return { x, y };
      })
      .filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y));
    if (points.length > 1) return { type: "polyline", layer, points };
  }
  if (tag === "rect") {
    const x = toNumber(node.getAttribute("x"));
    const y = toNumber(node.getAttribute("y"));
    const width = toNumber(node.getAttribute("width"));
    const height = toNumber(node.getAttribute("height"));
    if (width > 0 && height > 0) return { type: "rect", layer, points: [{ x, y }, { x: x + width, y: y + height }] };
  }
  if (tag === "circle") {
    const r = toNumber(node.getAttribute("r"));
    if (r > 0) {
      return {
        type: "circle",
        layer,
        cx: toNumber(node.getAttribute("cx")),
        cy: toNumber(node.getAttribute("cy")),
        r,
      };
    }
  }
  return null;
}

function importSvgSource(source, fileName = "SVG") {
  const doc = new DOMParser().parseFromString(source, "image/svg+xml");
  if (doc.querySelector("parsererror")) {
    log(t("importInvalid"));
    return;
  }
  const imported = [...doc.querySelectorAll("line, polyline, rect, circle")]
    .map(entityFromSvgNode)
    .filter(Boolean)
    .filter((entity) => entity.type !== "rect" || entity.layer !== layerSelect.value || entity.points[0].x !== 0 || entity.points[1].x !== 1600);
  if (!imported.length) {
    log(t("importEmpty"));
    return;
  }
  snapshot();
  state.entities.push(...imported.map((entity) => ({ id: makeId(), ...entity })));
  state.selectedId = null;
  state.points = [];
  previewLayer.replaceChildren();
  render();
  log(t("importedSvg", { count: imported.length, file: fileName }));
}

function importSvg() {
  svgImportInput.click();
}

function runAction(action) {
  if (action === "copy") copySelected();
  if (action === "move") moveSelected();
  if (action === "erase") eraseSelected();
  if (action === "undo") undo();
  if (action === "import-svg") importSvg();
  if (action === "export-svg") exportSvg();
}

function runCommand(raw) {
  const command = raw.trim().toUpperCase();
  if (!command) return;
  log(t("command", { command }));
  const aliases = {
    L: "line",
    LINE: "line",
    PL: "polyline",
    PLINE: "polyline",
    RECT: "rect",
    RECTANGLE: "rect",
    C: "circle",
    CIRCLE: "circle",
    DIM: "dimension",
    DIMALIGNED: "dimension",
    SELECT: "select",
  };
  if (aliases[command]) return setTool(aliases[command]);
  if (command === "COPY" || command === "CO") return copySelected();
  if (command === "MOVE" || command === "M") return moveSelected();
  if (command === "ERASE" || command === "E") return eraseSelected();
  if (command === "UNDO" || command === "U") return undo();
  if (command === "IMPORTSVG" || command === "IMPORT") return importSvg();
  if (command === "EXPORTSVG" || command === "SVG" || command === "SAVEAS") return exportSvg();
  if (command === "CLEAR") {
    snapshot();
    state.entities = [];
    state.selectedId = null;
    return render();
  }
  log(t("unknownCommand"));
}

svg.addEventListener("mousemove", (event) => {
  const point = screenToSvgPoint(event);
  cursorReadout.textContent = `X ${point.x.toFixed(2)} / Y ${point.y.toFixed(2)}`;
  dynamicInput.hidden = false;
  dynamicInput.style.left = `${event.clientX}px`;
  dynamicInput.style.top = `${event.clientY}px`;
  dynamicInput.textContent = state.points[0] ? `@ ${distance(state.points[0], point).toFixed(2)}` : `${point.x.toFixed(0)}, ${point.y.toFixed(0)}`;
  preview(point);
});

svg.addEventListener("mouseleave", () => {
  dynamicInput.hidden = true;
});

svg.addEventListener("click", (event) => {
  const entityNode = event.target.closest(".entity");
  if (state.tool === "select" && entityNode) return selectEntity(entityNode.dataset.id);
  const point = screenToSvgPoint(event);
  if (state.moving) {
    if (!state.moving.base) {
      state.moving.base = point;
      log(t("specifyDestination"));
    } else {
      moveEntity(state.moving.id, state.moving.base, point);
      state.moving = null;
    }
    return;
  }
  finishPoint(point);
});

svg.addEventListener("dblclick", () => {
  if (state.tool === "polyline" && state.points.length > 1) {
    addEntity({ type: "polyline", points: [...state.points] });
    state.points = [];
    previewLayer.replaceChildren();
  }
});

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => runAction(button.dataset.action));
});

svgImportInput.addEventListener("change", () => {
  const file = svgImportInput.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => importSvgSource(String(reader.result || ""), file.name));
  reader.readAsText(file);
  svgImportInput.value = "";
});

commandForm.addEventListener("submit", (event) => {
  event.preventDefault();
  runCommand(commandInput.value);
  commandInput.value = "";
});

snapToggle.addEventListener("change", () => {
  updateSnapState();
});

function updateSnapState() {
  snapState.textContent = snapToggle.checked ? t("snapOn") : t("snapOff");
}

languageSelect.addEventListener("change", () => applyLanguage(languageSelect.value));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    state.points = [];
    state.moving = null;
    previewLayer.replaceChildren();
    log(t("cancel"));
  }
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    event.preventDefault();
    undo();
  }
});

setTool("line");
applyLanguage(currentLanguage);
log(t("ready"));
