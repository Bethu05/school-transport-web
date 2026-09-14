import {
  useEffect,
  useRef,
} from 'react';

import {
  Box,
  Paper,
  Typography,
} from '@mui/material';

import {
  MapRounded,
} from '@mui/icons-material';

import * as L from 'leaflet';

import 'leaflet/dist/leaflet.css';
import './live-tracking-map.css';

export interface LiveMapMarker {
  key: string;

  kind?:
    | 'vehicle'
    | 'stop';

  label: string;

  subtitle?:
    string;

  latitude: number;
  longitude: number;

  speedKph?:
    number | null;

  heading?:
    number | null;

  accuracyMeters?:
    number | null;
}

interface LiveTrackingMapProps {
  markers:
    readonly LiveMapMarker[];

  height?:
    number;
}

function createMarkerIcon(
  marker:
    LiveMapMarker,
):
  L.DivIcon {
  const isStop =
    marker.kind ===
    'stop';

  return L.divIcon({
    className:
      'tracking-map-marker-wrapper',

    html: `
      <div class="tracking-map-marker ${
        isStop
          ? 'tracking-map-marker--stop'
          : ''
      }">
        <span class="tracking-map-marker__bus">
          ${
            isStop
              ? 'STOP'
              : 'BUS'
          }
        </span>
      </div>
    `,

    iconSize: [
      42,
      42,
    ],

    iconAnchor: [
      21,
      21,
    ],

    popupAnchor: [
      0,
      -22,
    ],
  });
}

function createPopup(
  marker:
    LiveMapMarker,
): HTMLElement {
  const container =
    document.createElement(
      'div',
    );

  container.className =
    'tracking-map-popup';

  const title =
    document.createElement(
      'strong',
    );

  title.textContent =
    marker.label;

  container.appendChild(
    title,
  );

  if (
    marker.subtitle
  ) {
    const subtitle =
      document.createElement(
        'div',
      );

    subtitle.textContent =
      marker.subtitle;

    subtitle.className =
      'tracking-map-popup__secondary';

    container.appendChild(
      subtitle,
    );
  }

  const coordinates =
    document.createElement(
      'div',
    );

  coordinates.textContent =
    `${marker.latitude.toFixed(
      6,
    )}, ${marker.longitude.toFixed(
      6,
    )}`;

  coordinates.className =
    'tracking-map-popup__secondary';

  container.appendChild(
    coordinates,
  );

  if (
    marker.speedKph !==
      undefined &&
    marker.speedKph !==
      null
  ) {
    const speed =
      document.createElement(
        'div',
      );

    speed.textContent =
      `Speed: ${Math.round(
        marker.speedKph,
      )} km/h`;

    speed.className =
      'tracking-map-popup__secondary';

    container.appendChild(
      speed,
    );
  }

  return container;
}

export function LiveTrackingMap({
  markers,
  height = 420,
}: LiveTrackingMapProps) {
  const containerRef =
    useRef<
      HTMLDivElement | null
    >(null);

  const mapRef =
    useRef<
      L.Map | null
    >(null);

  const markerLayerRef =
    useRef<
      L.LayerGroup | null
    >(null);

  const accuracyLayerRef =
    useRef<
      L.LayerGroup | null
    >(null);

  // ==========================================================
  // INITIALISE MAP ONCE
  // ==========================================================

  useEffect(
    () => {
      if (
        !containerRef.current ||
        mapRef.current
      ) {
        return;
      }

      const map =
        L.map(
          containerRef.current,
          {
            zoomControl:
              true,

            attributionControl:
              true,
          },
        );

      /**
       * Neutral world position until the first GPS
       * coordinates arrive.
       *
       * We do not hard-code Nairobi because the platform
       * is multi-tenant and may operate in other regions.
       */
      map.setView(
        [
          0,
          0,
        ],
        2,
      );

      L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom:
            19,

          attribution:
            '&copy; OpenStreetMap contributors',
        },
      ).addTo(
        map,
      );

      markerLayerRef.current =
        L.layerGroup().addTo(
          map,
        );

      accuracyLayerRef.current =
        L.layerGroup().addTo(
          map,
        );

      mapRef.current =
        map;

      requestAnimationFrame(
        () => {
          map.invalidateSize();
        },
      );

      return () => {
        markerLayerRef.current
          ?.clearLayers();

        accuracyLayerRef.current
          ?.clearLayers();

        map.remove();

        mapRef.current =
          null;

        markerLayerRef.current =
          null;

        accuracyLayerRef.current =
          null;
      };
    },
    [],
  );

  // ==========================================================
  // UPDATE LIVE MARKERS
  // ==========================================================

  useEffect(
    () => {
      const map =
        mapRef.current;

      const markerLayer =
        markerLayerRef.current;

      const accuracyLayer =
        accuracyLayerRef.current;

      if (
        !map ||
        !markerLayer ||
        !accuracyLayer
      ) {
        return;
      }

      markerLayer.clearLayers();

      accuracyLayer.clearLayers();

      if (
        markers.length ===
        0
      ) {
        return;
      }

      const positions:
        L.LatLngExpression[] =
        [];

      for (
        const marker
        of markers
      ) {
        const coordinate:
          L.LatLngExpression =
          [
            marker.latitude,
            marker.longitude,
          ];

        positions.push(
          coordinate,
        );

        const leafletMarker =
          L.marker(
            coordinate,
            {
              icon:
                createMarkerIcon(
                  marker,
                ),

              title:
                marker.label,
            },
          );

        const tooltip =
          document.createElement(
            'span',
          );

        tooltip.textContent =
          marker.label;

        leafletMarker.bindTooltip(
          tooltip,
          {
            direction:
              'top',

            offset:
              [
                0,
                -18,
              ],

            opacity:
              0.95,
          },
        );

        leafletMarker.bindPopup(
          createPopup(
            marker,
          ),
        );

        leafletMarker.addTo(
          markerLayer,
        );

        if (
          marker.accuracyMeters &&
          marker.accuracyMeters >
            0
        ) {
          L.circle(
            coordinate,
            {
              radius:
                marker.accuracyMeters,

              weight:
                1,

              fillOpacity:
                0.07,
            },
          ).addTo(
            accuracyLayer,
          );
        }
      }

      map.invalidateSize();

      if (
        positions.length ===
        1
      ) {
        map.setView(
          positions[0],
          15,
          {
            animate:
              false,
          },
        );

        return;
      }

      const bounds =
        L.latLngBounds(
          positions,
        );

      map.fitBounds(
        bounds.pad(
          0.22,
        ),
        {
          padding: [
            32,
            32,
          ],

          maxZoom:
            15,

          animate:
            false,
        },
      );
    },
    [
      markers,
    ],
  );

  if (
    markers.length ===
    0
  ) {
    return (
      <Paper
        elevation={
          0
        }
        sx={{
          p:
            4,

          textAlign:
            'center',

          border:
            '1px solid',

          borderColor:
            'divider',
        }}
      >
        <MapRounded
          sx={{
            fontSize:
              40,

            color:
              'text.secondary',
          }}
        />

        <Typography
          sx={{
            mt:
              1,

            color:
              'text.secondary',

            fontSize:
              12.5,
          }}
        >
          Waiting for GPS coordinates before displaying the map.
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      elevation={
        0
      }
      sx={{
        overflow:
          'hidden',

        border:
          '1px solid',

        borderColor:
          'divider',
      }}
    >
      <Box
        ref={
          containerRef
        }
        className="tracking-map"
        sx={{
          height,
        }}
      />
    </Paper>
  );
}
