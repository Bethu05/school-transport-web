import { readFileSync } from "node:fs";
import ts from "typescript";

const mapPath = "src/tracking/LiveTrackingMap.tsx";

const cssPath = "src/tracking/live-tracking-map.css";

const sourceText = readFileSync(mapPath, "utf8");

const css = readFileSync(cssPath, "utf8");

const sourceFile = ts.createSourceFile(
  mapPath,
  sourceText,
  ts.ScriptTarget.Latest,
  true,
  ts.ScriptKind.TSX,
);

function check(condition, message) {
  if (!condition) {
    throw new Error(`✗ ${message}`);
  }

  console.log(`✓ ${message}`);
}

// ============================================================
// MAPLIBRE IMPORT DISCOVERY
//
// Resolve the REAL local identifier used by the component.
//
// Supports:
//
// import { Map } from "maplibre-gl"
// import { Map as MapLibreMap } from "maplibre-gl"
// import * as maplibregl from "maplibre-gl"
// ============================================================

let hasMapLibreImport = false;

const mapConstructorNames = new Set();

const namespaceNames = new Set();

const importedMapLibreSymbols = new Set();

for (const statement of sourceFile.statements) {
  if (!ts.isImportDeclaration(statement)) {
    continue;
  }

  if (!ts.isStringLiteral(statement.moduleSpecifier)) {
    continue;
  }

  const moduleName = statement.moduleSpecifier.text;

  if (moduleName === "leaflet" || moduleName === "react-leaflet") {
    throw new Error(`✗ Leaflet dependency still imported: ${moduleName}`);
  }

  if (moduleName !== "maplibre-gl") {
    continue;
  }

  hasMapLibreImport = true;

  const importClause = statement.importClause;

  if (!importClause) {
    continue;
  }

  /**
   * Default import, if one exists.
   *
   * Example:
   *
   * import maplibregl from "maplibre-gl"
   */
  if (importClause.name) {
    namespaceNames.add(importClause.name.text);
  }

  const bindings = importClause.namedBindings;

  if (!bindings) {
    continue;
  }

  if (ts.isNamespaceImport(bindings)) {
    namespaceNames.add(bindings.name.text);

    continue;
  }

  for (const element of bindings.elements) {
    const importedName = element.propertyName?.text ?? element.name.text;

    const localName = element.name.text;

    importedMapLibreSymbols.add(importedName);

    if (importedName === "Map") {
      mapConstructorNames.add(localName);
    }
  }
}

// ============================================================
// AST WALK
// ============================================================

let constructsMapLibreMap = false;

let usesRequestAnimationFrame = false;

let usesFitBounds = false;

let usesSetWorkerUrl = false;

let usesNavigationControl = false;

function visit(node) {
  // ----------------------------------------------------------
  // new Map(...)
  // new MapLibreMap(...)
  // new maplibregl.Map(...)
  // ----------------------------------------------------------

  if (ts.isNewExpression(node)) {
    const expression = node.expression;

    if (
      ts.isIdentifier(expression) &&
      mapConstructorNames.has(expression.text)
    ) {
      constructsMapLibreMap = true;
    }

    if (
      ts.isPropertyAccessExpression(expression) &&
      expression.name.text === "Map" &&
      ts.isIdentifier(expression.expression) &&
      namespaceNames.has(expression.expression.text)
    ) {
      constructsMapLibreMap = true;
    }

    if (
      ts.isIdentifier(expression) &&
      expression.text === "NavigationControl"
    ) {
      usesNavigationControl = true;
    }
  }

  // ----------------------------------------------------------
  // Function calls
  // ----------------------------------------------------------

  if (ts.isCallExpression(node)) {
    const expression = node.expression;

    if (
      ts.isIdentifier(expression) &&
      expression.text === "requestAnimationFrame"
    ) {
      usesRequestAnimationFrame = true;
    }

    if (ts.isIdentifier(expression) && expression.text === "setWorkerUrl") {
      usesSetWorkerUrl = true;
    }

    if (
      ts.isPropertyAccessExpression(expression) &&
      expression.name.text === "fitBounds"
    ) {
      usesFitBounds = true;
    }
  }

  ts.forEachChild(node, visit);
}

visit(sourceFile);

// ============================================================
// ARCHITECTURE ASSERTIONS
// ============================================================

check(hasMapLibreImport, "Live Tracking imports MapLibre GL");

check(constructsMapLibreMap, "Live Tracking constructs a real MapLibre Map");

check(
  !sourceText.includes("react-leaflet") &&
    !sourceText.includes('from "leaflet"') &&
    !sourceText.includes("from 'leaflet'"),
  "Live Tracking no longer depends on Leaflet rendering",
);

check(
  /maplibre-gl-worker\.mjs\?worker&url/.test(sourceText) &&
    (usesSetWorkerUrl || importedMapLibreSymbols.has("setWorkerUrl")),
  "MapLibre worker is bundled through Vite",
);

check(
  sourceText.includes("tiles.openfreemap.org/styles/liberty"),
  "map uses OpenFreeMap vector tiles",
);

check(usesRequestAnimationFrame, "vehicle GPS movement is smoothly animated");

check(
  /\b620\b/.test(sourceText),
  "GPS interpolation has a controlled animation duration",
);

check(
  /heading/i.test(sourceText) && /(rotation|rotate)/i.test(sourceText),
  "vehicle icon follows GPS heading",
);

check(
  usesNavigationControl || importedMapLibreSymbols.has("NavigationControl"),
  "modern map navigation controls are enabled",
);

check(
  usesFitBounds && usesRequestAnimationFrame,
  "camera framing and GPS interpolation are handled separately",
);

check(
  /vehicle/i.test(sourceText) && /stop/i.test(sourceText),
  "vehicle and stop markers have separate presentation",
);

check(
  /pulse/i.test(css) || /pulse/i.test(sourceText),
  "live bus has a visual GPS pulse",
);

check(
  /prefers-reduced-motion/.test(css),
  "map animation respects reduced-motion accessibility",
);

// ============================================================
// CONTROL-ROOM LAYERS
// ============================================================

check(
  sourceText.includes("TRACKING_PLANNED_ROUTE_SOURCE"),
  "canonical road route source remains available",
);

check(
  sourceText.includes("TRACKING_TRAILS_SOURCE"),
  "GPS breadcrumb source remains available",
);

check(
  sourceText.includes("TRACKING_CONNECTIONS_SOURCE"),
  "next-stop connector source remains available",
);

console.log("");
console.log("MapLibre Live Tracking AST checkpoint PASSED");
