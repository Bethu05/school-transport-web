import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Box, Button, TextField, Typography } from "@mui/material";
import {
  type GeoJSONSource,
  LngLatBounds,
  Map as MapboxMap,
  Marker,
  NavigationControl,
} from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RouteGeometryLineString } from "../tracking/route-geometry.api";
import { projectPointOntoRoute } from "../tracking/route-segment";

const MAPBOX_ACCESS_TOKEN =
  import.meta.env.VITE_MAPBOX_ACCESS_TOKEN?.trim() ?? "";
const MAPBOX_STYLE =
  import.meta.env.VITE_MAPBOX_STYLE?.trim() ||
  "mapbox://styles/mapbox/streets-v12";
const ROUTE_SOURCE = "stop-location-route";
const ROUTE_LAYER = "stop-location-route-line";
interface StopLocationMapProps {
  latitude: number | null;
  longitude: number | null;
  routeGeometry?: RouteGeometryLineString | null;
  disabled?: boolean;
  onChange: (latitude: number, longitude: number) => void;
}

export function StopLocationMap({
  latitude,
  longitude,
  routeGeometry = null,
  disabled = false,
  onChange,
}: StopLocationMapProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const actualMarkerRef = useRef<Marker | null>(null);
  const anchorMarkerRef = useRef<Marker | null>(null);
  const onChangeRef = useRef(onChange);
  const disabledRef = useRef(disabled);
  const [mapReady, setMapReady] = useState(false);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    onChangeRef.current = onChange;
    disabledRef.current = disabled;
  }, [onChange, disabled]);

  const roadAnchor = useMemo(() => {
    if (
      latitude === null ||
      longitude === null ||
      !routeGeometry ||
      routeGeometry.coordinates.length < 2
    ) {
      return null;
    }

    return projectPointOntoRoute(routeGeometry.coordinates, {
      latitude,
      longitude,
    });
  }, [latitude, longitude, routeGeometry]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current || !MAPBOX_ACCESS_TOKEN) return;

    const map = new MapboxMap({
      container: containerRef.current,
      accessToken: MAPBOX_ACCESS_TOKEN,
      style: MAPBOX_STYLE,
      center: [0, 0],
      zoom: 2,
    });

    map.addControl(new NavigationControl(), "top-right");
    map.on("load", () => setMapReady(true));
    map.on("click", (event) => {
      if (!disabledRef.current) {
        onChangeRef.current(event.lngLat.lat, event.lngLat.lng);
      }
    });

    mapRef.current = map;

    return () => {
      actualMarkerRef.current?.remove();
      anchorMarkerRef.current?.remove();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (latitude === null || longitude === null) {
      actualMarkerRef.current?.remove();
      actualMarkerRef.current = null;
      return;
    }
    if (!actualMarkerRef.current) {
      const marker = new Marker({ draggable: !disabled, color: "#1565c0" })
        .setLngLat([longitude, latitude])
        .addTo(map);

      marker.on("dragend", () => {
        const point = marker.getLngLat();
        onChangeRef.current(point.lat, point.lng);
      });

      actualMarkerRef.current = marker;
      map.easeTo({ center: [longitude, latitude], zoom: 15 });
    } else {
      actualMarkerRef.current
        .setDraggable(!disabled)
        .setLngLat([longitude, latitude]);
    }
  }, [disabled, latitude, longitude, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const coordinates = routeGeometry?.coordinates ?? [];
    if (coordinates.length < 2) {
      if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER);
      if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE);
      return;
    }

    const data = {
      type: "Feature" as const,
      properties: {},
      geometry: { type: "LineString" as const, coordinates },
    };

    const source = map.getSource(ROUTE_SOURCE) as GeoJSONSource | undefined;

    if (source) {
      source.setData(data);
    } else {
      map.addSource(ROUTE_SOURCE, { type: "geojson", data });
      map.addLayer({
        id: ROUTE_LAYER,
        type: "line",
        source: ROUTE_SOURCE,
        paint: { "line-width": 4, "line-opacity": 0.8 },
      });
    }
    const bounds = new LngLatBounds();
    for (const coordinate of coordinates) bounds.extend(coordinate);
    map.fitBounds(bounds, { padding: 40, maxZoom: 16 });
  }, [mapReady, routeGeometry]);

  useEffect(() => {
    const map = mapRef.current;

    if (!map || !mapReady || !roadAnchor) {
      anchorMarkerRef.current?.remove();
      anchorMarkerRef.current = null;
      return;
    }

    const [anchorLongitude, anchorLatitude] = roadAnchor.coordinate;

    if (!anchorMarkerRef.current) {
      anchorMarkerRef.current = new Marker({ color: "#ed6c02", scale: 0.75 })
        .setLngLat([anchorLongitude, anchorLatitude])
        .addTo(map);
    } else {
      anchorMarkerRef.current.setLngLat([anchorLongitude, anchorLatitude]);
    }
  }, [mapReady, roadAnchor]);
  async function findAddress(): Promise<void> {
    const query = search.trim();

    if (!query || !MAPBOX_ACCESS_TOKEN) return;

    setSearching(true);
    setSearchError(null);

    try {
      const url = new URL("https://api.mapbox.com/search/geocode/v6/forward");
      url.searchParams.set("q", query);
      url.searchParams.set("access_token", MAPBOX_ACCESS_TOKEN);
      url.searchParams.set("limit", "5");

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Map search failed (${response.status})`);
      }

      const body = (await response.json()) as {
        features?: Array<{
          geometry?: { coordinates?: [number, number] };
        }>;
      };

      const coordinates = body.features?.[0]?.geometry?.coordinates;

      if (!coordinates) {
        setSearchError("No matching location found.");
        return;
      }

      const [nextLongitude, nextLatitude] = coordinates;
      onChangeRef.current(nextLatitude, nextLongitude);
      mapRef.current?.easeTo({
        center: [nextLongitude, nextLatitude],
        zoom: 16,
      });
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Address search failed.",
      );
    } finally {
      setSearching(false);
    }
  }

  if (!MAPBOX_ACCESS_TOKEN) {
    return (
      <Alert severity="warning" sx={{ gridColumn: "1 / -1" }}>
        Mapbox is not configured. Coordinates can still be entered manually.
      </Alert>
    );
  }

  return (
    <Box sx={{ gridColumn: "1 / -1" }}>
      <Typography sx={{ mb: 1, fontSize: 12, fontWeight: 800 }}>
        Stop location
      </Typography>
      <Typography sx={{ mb: 1, color: "text.secondary", fontSize: 11.5 }}>
        Drag the blue marker or click the map to set the actual pickup and
        geofence point. The orange marker shows the road anchor when route
        geometry is available.
      </Typography>
      <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
        <TextField
          fullWidth
          size="small"
          label="Find address or landmark"
          value={search}
          disabled={disabled || searching}
          onChange={(event) => setSearch(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void findAddress();
            }
          }}
        />
        <Button
          type="button"
          variant="outlined"
          disabled={disabled || searching || !search.trim()}
          onClick={() => void findAddress()}
        >
          {searching ? "Searching..." : "Find"}
        </Button>
      </Box>

      {searchError ? (
        <Alert severity="error" sx={{ mb: 1 }}>
          {searchError}
        </Alert>
      ) : null}

      <Box
        ref={containerRef}
        sx={{
          height: 360,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      />
    </Box>
  );
}
