import { useEffect, useRef, useState } from "react";

import { Box, Paper, Typography } from "@mui/material";

import { MapRounded } from "@mui/icons-material";

import {
  LngLatBounds,
  type GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  setWorkerUrl,
} from "maplibre-gl";

import type { FeatureCollection, LineString } from "geojson";

import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

import "maplibre-gl/dist/maplibre-gl.css";
import "./live-tracking-map.css";

/**
 * MapLibre v6 + Vite:
 *
 * The worker must be passed through Vite's worker pipeline.
 * Using ?worker&url produces a self-contained production worker.
 */
setWorkerUrl(workerUrl);

const OPEN_FREE_MAP_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export interface LiveMapMarker {
  key: string;

  kind?: "vehicle" | "stop";

  label: string;

  subtitle?: string;

  latitude: number;

  longitude: number;

  speedKph?: number | null;

  heading?: number | null;

  accuracyMeters?: number | null;
}

export interface LiveMapPlannedRoute {
  key: string;

  /**
   * Canonical road-following coordinates supplied by
   * routes.route_geometry.
   *
   * GeoJSON order is:
   *
   * [longitude, latitude]
   */
  coordinates: readonly [number, number][];
}

export type LiveMapRemainingRoute = LiveMapPlannedRoute;

export interface LiveMapTrailPoint {
  latitude: number;

  longitude: number;
}

export interface LiveMapTrail {
  key: string;

  points: readonly LiveMapTrailPoint[];
}

export interface LiveMapConnection {
  key: string;

  from: LiveMapTrailPoint;

  to: LiveMapTrailPoint;
}

interface LiveTrackingMapProps {
  markers: readonly LiveMapMarker[];

  plannedRoute?: LiveMapPlannedRoute | null;

  remainingRoute?: LiveMapRemainingRoute | null;

  trails?: readonly LiveMapTrail[];

  connections?: readonly LiveMapConnection[];

  selectedMarkerKey?: string | null;

  followMarkerKey?: string | null;

  onMarkerClick?: (markerKey: string) => void;

  height?: number;
}

const TRACKING_PLANNED_ROUTE_SOURCE = "tracking-planned-route";

const TRACKING_REMAINING_ROUTE_SOURCE = "tracking-remaining-route";

const TRACKING_TRAILS_SOURCE = "tracking-live-trails";

const TRACKING_CONNECTIONS_SOURCE = "tracking-live-connections";

function lineCollection(
  lines: readonly {
    key: string;

    coordinates: readonly [number, number][];
  }[],
): FeatureCollection<
  LineString,
  {
    key: string;
  }
> {
  return {
    type: "FeatureCollection",

    features: lines
      .filter((line) => line.coordinates.length >= 2)
      .map((line) => ({
        type: "Feature",

        properties: {
          key: line.key,
        },

        geometry: {
          type: "LineString",

          coordinates: line.coordinates.map((coordinate) => [
            coordinate[0],
            coordinate[1],
          ]),
        },
      })),
  };
}

interface MarkerAnimation {
  frameId: number;
}

function createPopupContent(marker: LiveMapMarker): HTMLElement {
  const container = document.createElement("div");

  container.className = "tracking-map-popup";

  const title = document.createElement("strong");

  title.textContent = marker.label;

  container.appendChild(title);

  if (marker.subtitle) {
    const subtitle = document.createElement("div");

    subtitle.textContent = marker.subtitle;

    subtitle.className = "tracking-map-popup__secondary";

    container.appendChild(subtitle);
  }

  if (
    marker.kind !== "stop" &&
    marker.speedKph !== undefined &&
    marker.speedKph !== null
  ) {
    const speed = document.createElement("div");

    speed.textContent = `Speed: ${Math.round(marker.speedKph)} km/h`;

    speed.className = "tracking-map-popup__secondary";

    container.appendChild(speed);
  }

  if (
    marker.kind !== "stop" &&
    marker.accuracyMeters !== undefined &&
    marker.accuracyMeters !== null
  ) {
    const accuracy = document.createElement("div");

    accuracy.textContent = `GPS accuracy: ±${Math.round(
      marker.accuracyMeters,
    )} m`;

    accuracy.className = "tracking-map-popup__secondary";

    container.appendChild(accuracy);
  }

  return container;
}

function formatVehicleSpeed(speedKph: number | null | undefined): string {
  if (
    speedKph === null ||
    speedKph === undefined ||
    !Number.isFinite(speedKph)
  ) {
    return "— km/h";
  }

  return `${Math.max(0, Math.round(speedKph))} km/h`;
}

function createVehicleElement(marker: LiveMapMarker): HTMLDivElement {
  const element = document.createElement("div");

  element.className = "tracking-map-vehicle";

  const pulse = document.createElement("div");

  pulse.className = "tracking-map-vehicle__pulse";

  element.appendChild(pulse);

  const body = document.createElement("div");

  body.className = "tracking-map-vehicle__body";

  body.dataset.vehicleHeading = "true";

  /**
   * The bus is drawn pointing north.
   *
   * GPS heading therefore maps naturally:
   *
   * 0   = north
   * 90  = east
   * 180 = south
   * 270 = west
   */
  body.style.transform = `rotate(${marker.heading ?? 0}deg)`;

  body.innerHTML = `
    <svg
      width="26"
      height="26"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="
          M7 2
          C5.34 2 4 3.34 4 5
          V16
          C4 16.74 4.4 17.39 5 17.73
          V20
          C5 20.55 5.45 21 6 21
          H7
          C7.55 21 8 20.55 8 20
          V19
          H16
          V20
          C16 20.55 16.45 21 17 21
          H18
          C18.55 21 19 20.55 19 20
          V17.73
          C19.6 17.39 20 16.74 20 16
          V5
          C20 3.34 18.66 2 17 2
          H7
          Z

          M7 4
          H17
          C17.55 4 18 4.45 18 5
          V9
          H6
          V5
          C6 4.45 6.45 4 7 4
          Z

          M7 14.5
          A1.5 1.5 0 1 0 7 17.5
          A1.5 1.5 0 1 0 7 14.5

          M17 14.5
          A1.5 1.5 0 1 0 17 17.5
          A1.5 1.5 0 1 0 17 14.5
        "
        fill="currentColor"
      />
    </svg>
  `;

  element.appendChild(body);

  /**
   * Speed is deliberately outside the rotating bus body.
   *
   * This keeps the text upright while only the bus icon follows
   * the GPS heading.
   */
  const speed = document.createElement("div");

  speed.className = "tracking-map-vehicle__speed";

  speed.dataset.vehicleSpeed = "true";

  speed.textContent = formatVehicleSpeed(marker.speedKph);

  element.appendChild(speed);

  const label = document.createElement("div");

  label.className = "tracking-map-vehicle__label";

  label.textContent = marker.label;

  element.appendChild(label);

  return element;
}

function createStopElement(marker: LiveMapMarker): HTMLDivElement {
  const element = document.createElement("div");

  element.className = "tracking-map-stop";

  const pin = document.createElement("div");

  pin.className = "tracking-map-stop__pin";

  pin.innerHTML = `
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="
          M12 2
          C7.58 2 4 5.58 4 10
          C4 15.5 12 22 12 22
          C12 22 20 15.5 20 10
          C20 5.58 16.42 2 12 2
          Z

          M12 7
          A3 3 0 1 1 12 13
          A3 3 0 1 1 12 7
        "
        fill="currentColor"
      />
    </svg>
  `;

  element.appendChild(pin);

  const label = document.createElement("div");

  label.className = "tracking-map-stop__label";

  label.textContent = marker.label;

  element.appendChild(label);

  return element;
}

function updateVehicleSpeed(
  element: HTMLElement,
  speedKph: number | null | undefined,
): void {
  const speed = element.querySelector<HTMLElement>(
    '[data-vehicle-speed="true"]',
  );

  if (!speed) {
    return;
  }

  speed.textContent = formatVehicleSpeed(speedKph);
}

function updateVehicleHeading(
  element: HTMLElement,

  heading: number | null | undefined,
): void {
  const body = element.querySelector<HTMLElement>(
    '[data-vehicle-heading="true"]',
  );

  if (!body) {
    return;
  }

  body.style.transform = `rotate(${heading ?? 0}deg)`;
}

function animateMarkerPosition(
  marker: Marker,

  targetLongitude: number,

  targetLatitude: number,

  animation: MarkerAnimation | undefined,

  setAnimation: (animation: MarkerAnimation | null) => void,
): void {
  if (animation) {
    cancelAnimationFrame(animation.frameId);
  }

  const start = marker.getLngLat();

  const longitudeDelta = targetLongitude - start.lng;

  const latitudeDelta = targetLatitude - start.lat;

  /**
   * Tiny movements do not need animation.
   */
  if (
    Math.abs(longitudeDelta) < 0.000001 &&
    Math.abs(latitudeDelta) < 0.000001
  ) {
    marker.setLngLat([targetLongitude, targetLatitude]);

    setAnimation(null);

    return;
  }

  const startedAt = performance.now();

  const durationMs = 620;

  function frame(now: number): void {
    const elapsed = now - startedAt;

    const rawProgress = Math.min(
      1,

      elapsed / durationMs,
    );

    /**
     * Ease-out cubic gives the bus a smoother GPS-like motion
     * instead of snapping point-to-point.
     */
    const progress =
      1 -
      Math.pow(
        1 - rawProgress,

        3,
      );

    marker.setLngLat([
      start.lng + longitudeDelta * progress,

      start.lat + latitudeDelta * progress,
    ]);

    if (rawProgress < 1) {
      const frameId = requestAnimationFrame(frame);

      setAnimation({
        frameId,
      });

      return;
    }

    setAnimation(null);
  }

  const frameId = requestAnimationFrame(frame);

  setAnimation({
    frameId,
  });
}

export function LiveTrackingMap({
  markers,
  plannedRoute = null,
  remainingRoute = null,
  trails = [],
  connections = [],
  selectedMarkerKey = null,
  followMarkerKey = null,
  onMarkerClick,
  height = 420,
}: LiveTrackingMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const mapRef = useRef<MapLibreMap | null>(null);

  const markerRefs = useRef<Map<string, Marker>>(new Map());

  const animationRefs = useRef<Map<string, MarkerAnimation>>(new Map());

  const onMarkerClickRef = useRef(onMarkerClick);

  useEffect(() => {
    onMarkerClickRef.current = onMarkerClick;
  }, [onMarkerClick]);

  const lastMarkerKeySignatureRef = useRef("");

  const [mapReady, setMapReady] = useState(false);

  // ==========================================================
  // INITIALISE MAPLIBRE ONCE
  // ==========================================================

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    const map = new MapLibreMap({
      container: containerRef.current,

      style: OPEN_FREE_MAP_STYLE,

      center: [0, 0],

      zoom: 2,

      attributionControl: {},

      pitchWithRotate: false,

      dragRotate: false,

      touchPitch: false,
    });

    map.addControl(
      new NavigationControl({
        showCompass: true,

        showZoom: true,

        visualizePitch: false,
      }),

      "top-right",
    );

    function handleLoad(): void {
      /**
       * Realtime trail and next-stop connection lines are
       * regular GeoJSON sources so their data can be updated
       * without rebuilding the basemap.
       */
      // --------------------------------------------------
      // CANONICAL PLANNED ROAD ROUTE
      // --------------------------------------------------

      map.addSource(TRACKING_PLANNED_ROUTE_SOURCE, {
        type: "geojson",

        data: lineCollection([]),
      });

      /**
       * A darker casing underneath gives the planned road
       * route strong contrast against any basemap style.
       */
      map.addLayer({
        id: "tracking-planned-route-casing",

        type: "line",

        source: TRACKING_PLANNED_ROUTE_SOURCE,

        layout: {
          "line-cap": "round",

          "line-join": "round",
        },

        paint: {
          "line-color": "#0f172a",

          "line-width": 7,

          "line-opacity": 0.28,
        },
      });

      map.addLayer({
        id: "tracking-planned-route-line",

        type: "line",

        source: TRACKING_PLANNED_ROUTE_SOURCE,

        layout: {
          "line-cap": "round",

          "line-join": "round",
        },

        paint: {
          "line-color": "#0f766e",

          "line-width": 4,

          "line-opacity": 0.88,
        },
      });

      // --------------------------------------------------
      // REMAINING ROAD ROUTE
      // --------------------------------------------------

      map.addSource(TRACKING_REMAINING_ROUTE_SOURCE, {
        type: "geojson",

        data: lineCollection([]),
      });

      /**
       * The remaining-route highlight is deliberately separate
       * from the full planned route and the GPS breadcrumb.
       *
       * It follows the canonical LineString from the live bus
       * projection to the current next-stop projection.
       */
      map.addLayer({
        id: "tracking-remaining-route-casing",

        type: "line",

        source: TRACKING_REMAINING_ROUTE_SOURCE,

        layout: {
          "line-cap": "round",

          "line-join": "round",
        },

        paint: {
          "line-color": "#ffffff",

          "line-width": 9,

          "line-opacity": 0.92,
        },
      });

      map.addLayer({
        id: "tracking-remaining-route-line",

        type: "line",

        source: TRACKING_REMAINING_ROUTE_SOURCE,

        layout: {
          "line-cap": "round",

          "line-join": "round",
        },

        paint: {
          "line-color": "#f59e0b",

          "line-width": 5,

          "line-opacity": 0.98,
        },
      });

      map.addSource(TRACKING_TRAILS_SOURCE, {
        type: "geojson",

        data: lineCollection([]),
      });

      map.addLayer({
        id: "tracking-live-trails-line",

        type: "line",

        source: TRACKING_TRAILS_SOURCE,

        layout: {
          "line-cap": "round",

          "line-join": "round",
        },

        paint: {
          "line-color": "#0f766e",

          "line-width": 4,

          "line-opacity": 0.58,
        },
      });

      map.addSource(TRACKING_CONNECTIONS_SOURCE, {
        type: "geojson",

        data: lineCollection([]),
      });

      /**
       * NEXT-STOP CONNECTOR
       *
       * The white casing keeps the connector visible over roads,
       * buildings and the canonical route.
       *
       * The dotted layer sits above it and is updated continuously
       * from the live vehicle position to location.nextStop.
       */
      map.addLayer({
        id: "tracking-live-connections-casing",

        type: "line",

        source: TRACKING_CONNECTIONS_SOURCE,

        layout: {
          "line-cap": "round",

          "line-join": "round",
        },

        paint: {
          "line-color": "#ffffff",

          "line-width": 6,

          "line-opacity": 0.9,
        },
      });

      map.addLayer({
        id: "tracking-live-connections-line",

        type: "line",

        source: TRACKING_CONNECTIONS_SOURCE,

        layout: {
          "line-cap": "round",

          "line-join": "round",
        },

        paint: {
          "line-color": "#0f172a",

          "line-width": 3,

          "line-opacity": 0.95,

          /**
           * Short dash + larger gap combined with round line caps
           * produces a clear dotted navigation-style connector.
           */
          "line-dasharray": [0.5, 1.8],
        },
      });

      setMapReady(true);

      window.setTimeout(
        () => {
          map.resize();
        },

        0,
      );
    }

    map.on("load", handleLoad);

    mapRef.current = map;

    /**
     * Snapshot these mutable registries for this map instance.
     *
     * Cleanup must operate on the same marker/animation
     * collections that belonged to this map instance rather
     * than reading ref.current for the first time later.
     */
    const markerRegistry = markerRefs.current;

    const animationRegistry = animationRefs.current;

    return () => {
      map.off("load", handleLoad);

      for (const animation of animationRegistry.values()) {
        cancelAnimationFrame(animation.frameId);
      }

      animationRegistry.clear();

      for (const marker of markerRegistry.values()) {
        marker.remove();
      }

      markerRegistry.clear();

      map.remove();

      mapRef.current = null;
    };
  }, []);

  // ==========================================================
  // UPDATE GPS BREADCRUMBS / NEXT-STOP CONNECTIONS
  // ==========================================================

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady) {
      return;
    }

    const plannedRouteSource = map.getSource(TRACKING_PLANNED_ROUTE_SOURCE) as
      GeoJSONSource | undefined;

    void plannedRouteSource?.setData(
      lineCollection(
        plannedRoute && plannedRoute.coordinates.length >= 2
          ? [
              {
                key: plannedRoute.key,

                coordinates: plannedRoute.coordinates,
              },
            ]
          : [],
      ),
    );

    const remainingRouteSource = map.getSource(
      TRACKING_REMAINING_ROUTE_SOURCE,
    ) as GeoJSONSource | undefined;

    void remainingRouteSource?.setData(
      lineCollection(
        remainingRoute && remainingRoute.coordinates.length >= 2
          ? [
              {
                key: remainingRoute.key,

                coordinates: remainingRoute.coordinates,
              },
            ]
          : [],
      ),
    );

    const trailSource = map.getSource(TRACKING_TRAILS_SOURCE) as
      GeoJSONSource | undefined;

    void trailSource?.setData(
      lineCollection(
        trails.map((trail) => ({
          key: trail.key,

          coordinates: trail.points.map(
            (point) => [point.longitude, point.latitude] as [number, number],
          ),
        })),
      ),
    );

    const connectionSource = map.getSource(TRACKING_CONNECTIONS_SOURCE) as
      GeoJSONSource | undefined;

    void connectionSource?.setData(
      lineCollection(
        connections.map((connection) => ({
          key: connection.key,

          coordinates: [
            [connection.from.longitude, connection.from.latitude],

            [connection.to.longitude, connection.to.latitude],
          ],
        })),
      ),
    );
  }, [plannedRoute, remainingRoute, trails, connections, mapReady]);

  // ==========================================================
  // CREATE / UPDATE LIVE MARKERS
  // ==========================================================

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady) {
      return;
    }

    const incomingKeys = new Set(markers.map((marker) => marker.key));

    // --------------------------------------------------------
    // Remove markers that no longer exist.
    // --------------------------------------------------------

    for (const [key, existingMarker] of markerRefs.current.entries()) {
      if (incomingKeys.has(key)) {
        continue;
      }

      const animation = animationRefs.current.get(key);

      if (animation) {
        cancelAnimationFrame(animation.frameId);

        animationRefs.current.delete(key);
      }

      existingMarker.remove();

      markerRefs.current.delete(key);
    }

    // --------------------------------------------------------
    // Create or smoothly move every current marker.
    // --------------------------------------------------------

    for (const marker of markers) {
      const existingMarker = markerRefs.current.get(marker.key);

      if (existingMarker) {
        const element = existingMarker.getElement();

        element.classList.toggle(
          "tracking-map-vehicle--selected",

          marker.kind !== "stop" && marker.key === selectedMarkerKey,
        );

        if (marker.kind !== "stop") {
          updateVehicleHeading(element, marker.heading);

          updateVehicleSpeed(element, marker.speedKph);

          const label = element.querySelector<HTMLElement>(
            ".tracking-map-vehicle__label",
          );

          if (label) {
            label.textContent = marker.label;
          }
        }

        existingMarker.getPopup()?.setDOMContent(createPopupContent(marker));

        if (marker.kind === "stop") {
          existingMarker.setLngLat([marker.longitude, marker.latitude]);

          continue;
        }

        animateMarkerPosition(
          existingMarker,

          marker.longitude,

          marker.latitude,

          animationRefs.current.get(marker.key),

          (animation) => {
            if (animation) {
              animationRefs.current.set(marker.key, animation);
            } else {
              animationRefs.current.delete(marker.key);
            }
          },
        );

        continue;
      }

      const element =
        marker.kind === "stop"
          ? createStopElement(marker)
          : createVehicleElement(marker);

      if (marker.kind !== "stop") {
        element.classList.toggle(
          "tracking-map-vehicle--selected",

          marker.key === selectedMarkerKey,
        );

        element.addEventListener("click", (event) => {
          event.stopPropagation();

          onMarkerClickRef.current?.(marker.key);
        });
      }

      const popup = new Popup({
        closeButton: false,

        closeOnClick: true,

        offset: 30,

        maxWidth: "280px",
      }).setDOMContent(createPopupContent(marker));

      const mapMarker = new Marker({
        element,

        anchor: "center",
      })
        .setLngLat([marker.longitude, marker.latitude])
        .setPopup(popup)
        .addTo(map);

      markerRefs.current.set(marker.key, mapMarker);
    }

    // --------------------------------------------------------
    // FOLLOW MODE
    //
    // Keep the chosen bus centred as GPS packets arrive.
    // Other operator map movement remains untouched when
    // Follow Bus is disabled.
    // --------------------------------------------------------

    if (followMarkerKey) {
      const followedMarker = markerRefs.current.get(followMarkerKey);

      if (followedMarker) {
        map.easeTo({
          center: followedMarker.getLngLat(),

          duration: 500,
        });

        return;
      }
    }

    // --------------------------------------------------------
    // FIT ONLY WHEN THE SET OF MARKERS CHANGES.
    //
    // GPS position changes alone must NOT continuously
    // recenter or zoom the operator's map.
    // --------------------------------------------------------

    const keySignature = markers
      .map((marker) => marker.key)
      .sort()
      .join("|");

    if (keySignature === lastMarkerKeySignatureRef.current) {
      return;
    }

    lastMarkerKeySignatureRef.current = keySignature;

    if (markers.length === 0) {
      return;
    }

    if (markers.length === 1) {
      map.easeTo({
        center: [markers[0].longitude, markers[0].latitude],

        zoom: 15,

        duration: 700,
      });

      return;
    }

    const bounds = new LngLatBounds();

    for (const marker of markers) {
      bounds.extend([marker.longitude, marker.latitude]);
    }

    map.fitBounds(
      bounds,

      {
        padding: 60,

        maxZoom: 15,

        duration: 700,
      },
    );
  }, [markers, mapReady, selectedMarkerKey, followMarkerKey]);

  if (markers.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 4,

          textAlign: "center",

          border: "1px solid",

          borderColor: "divider",
        }}
      >
        <MapRounded
          sx={{
            fontSize: 40,

            color: "text.secondary",
          }}
        />

        <Typography
          sx={{
            mt: 1,

            color: "text.secondary",

            fontSize: 12.5,
          }}
        >
          Waiting for GPS coordinates before displaying the map.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={0}
      sx={{
        overflow: "hidden",

        position: "relative",

        border: "1px solid",

        borderColor: "divider",

        borderRadius: 2.5,
      }}
    >
      <Box
        ref={containerRef}
        className="tracking-map"
        sx={{
          height,
        }}
      />
    </Paper>
  );
}
