import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { Box, Button, Chip, Paper, Typography } from "@mui/material";

import type { TrackingOperationalTripMapStop } from "./tracking-snapshot.api";

interface TripStopsOverlayProps {
  stops: readonly TrackingOperationalTripMapStop[];
  nextStopId: string | null;
  childrenByStopId: Readonly<Record<string, string[]>>;
}

interface DragOffset {
  x: number;
  y: number;
}

interface DragOrigin {
  pointerX: number;
  pointerY: number;
  startX: number;
  startY: number;
}

export function TripStopsOverlay({
  stops,
  nextStopId,
  childrenByStopId,
}: TripStopsOverlayProps) {
  const [expanded, setExpanded] = useState(true);

  const [dragOffset, setDragOffset] = useState<DragOffset>({
    x: 0,
    y: 0,
  });

  const dragOriginRef = useRef<DragOrigin | null>(null);

  if (stops.length === 0) {
    return null;
  }

  const nextStop = stops.find((stop) => stop.stopId === nextStopId) ?? null;

  const nextStopOrder = nextStop?.stopOrder ?? null;

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>): void {
    const target = event.target as HTMLElement;

    if (target.closest("button")) {
      return;
    }

    dragOriginRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      startX: dragOffset.x,
      startY: dragOffset.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>): void {
    const origin = dragOriginRef.current;

    if (!origin) {
      return;
    }

    setDragOffset({
      x: origin.startX + event.clientX - origin.pointerX,
      y: origin.startY + event.clientY - origin.pointerY,
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>): void {
    dragOriginRef.current = null;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <Paper
      data-trip-stops-overlay
      elevation={10}
      sx={{
        position: "absolute",
        top: 12,
        left: 12,
        zIndex: 5,

        transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0)`,

        width: {
          xs: "calc(100% - 24px)",
          sm: 325,
        },

        maxWidth: 325,

        overflow: "hidden",

        bgcolor: "rgba(255, 255, 255, 0.72)",

        backdropFilter: "blur(14px) saturate(130%)",
        WebkitBackdropFilter: "blur(14px) saturate(130%)",

        border: "1px solid rgba(255,255,255,0.7)",

        boxShadow:
          "0 14px 38px rgba(15,23,42,0.18), 0 3px 10px rgba(15,23,42,0.08)",
      }}
    >
      <Box
        data-trip-stops-drag-handle
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        sx={{
          px: 1.5,
          py: 1.2,

          display: "flex",
          alignItems: "center",
          gap: 1,

          cursor: "grab",
          userSelect: "none",
          touchAction: "none",

          borderBottom: expanded ? "1px solid rgba(15,23,42,0.08)" : "none",

          "&:active": {
            cursor: "grabbing",
          },
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontSize: 12.5,
              fontWeight: 900,
            }}
          >
            Trip stops
          </Typography>

          <Typography
            noWrap
            sx={{
              mt: 0.1,
              fontSize: 10.5,
              color: "text.secondary",
            }}
          >
            {nextStop ? `Next · ${nextStop.stopName}` : `${stops.length} stops`}
          </Typography>
        </Box>

        <Chip
          size="small"
          label={`${stops.length}`}
          variant="outlined"
          sx={{
            bgcolor: "rgba(255,255,255,0.55)",
          }}
        />

        <Button
          size="small"
          onClick={() => setExpanded((current) => !current)}
          sx={{
            minWidth: 45,
            px: 0.75,
            fontSize: 10,
            bgcolor: "rgba(255,255,255,0.45)",
          }}
        >
          {expanded ? "Hide" : "Show"}
        </Button>
      </Box>

      {expanded ? (
        <Box
          sx={{
            maxHeight: 350,
            overflowY: "auto",
          }}
        >
          {stops.map((stop) => {
            const isNext = stop.stopId === nextStopId;

            const isCompleted =
              stop.status === "completed" ||
              (nextStopOrder !== null && stop.stopOrder < nextStopOrder);

            const isUpcoming = !isNext && !isCompleted;

            const children = childrenByStopId[stop.id] ?? [];

            return (
              <Box
                key={stop.id}
                sx={{
                  display: "grid",

                  gridTemplateColumns: "30px minmax(0, 1fr) auto",

                  alignItems: "center",
                  gap: 1,

                  px: 1.4,
                  py: 0.9,

                  borderBottom: "1px solid rgba(15,23,42,0.07)",

                  borderLeft: "3px solid",

                  borderLeftColor: isNext
                    ? "warning.main"
                    : isCompleted
                      ? "success.main"
                      : "info.main",

                  bgcolor: isNext
                    ? "rgba(237, 174, 73, 0.18)"
                    : isUpcoming
                      ? "rgba(25, 118, 210, 0.055)"
                      : "rgba(255,255,255,0.18)",

                  opacity: isCompleted ? 0.67 : 1,
                }}
              >
                <Box
                  sx={{
                    width: 25,
                    height: 25,

                    borderRadius: "50%",

                    display: "grid",
                    placeItems: "center",

                    fontSize: 10,
                    fontWeight: 900,

                    border: "2px solid",

                    borderColor: isNext
                      ? "warning.main"
                      : isCompleted
                        ? "success.main"
                        : "info.main",

                    bgcolor: isCompleted
                      ? "success.main"
                      : isNext
                        ? "warning.main"
                        : "rgba(255,255,255,0.65)",

                    color:
                      isCompleted || isNext ? "common.white" : "text.primary",
                  }}
                >
                  {stop.stopOrder}
                </Box>

                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    noWrap
                    sx={{
                      fontSize: 11.5,

                      fontWeight: isNext ? 900 : isUpcoming ? 750 : 600,
                    }}
                  >
                    {stop.stopName}
                  </Typography>

                  <Typography
                    noWrap
                    sx={{
                      mt: 0.1,
                      fontSize: 9.5,
                      color: "text.secondary",
                    }}
                  >
                    {children.length === 0
                      ? "No students"
                      : `${children.length} ${
                          children.length === 1 ? "student" : "students"
                        } · ${children.join(", ")}`}
                  </Typography>
                </Box>

                {isNext ? (
                  <Chip
                    size="small"
                    color="warning"
                    label="NEXT"
                    sx={{
                      height: 22,
                      fontSize: 9,
                      fontWeight: 900,
                    }}
                  />
                ) : isCompleted ? (
                  <Chip
                    size="small"
                    color="success"
                    variant="outlined"
                    label="DONE"
                    sx={{
                      height: 21,
                      fontSize: 8.5,
                      fontWeight: 800,
                      bgcolor: "rgba(255,255,255,0.4)",
                    }}
                  />
                ) : (
                  <Chip
                    size="small"
                    color="info"
                    variant="outlined"
                    label="UPCOMING"
                    sx={{
                      height: 21,
                      fontSize: 8.5,
                      fontWeight: 800,
                      bgcolor: "rgba(255,255,255,0.4)",
                    }}
                  />
                )}
              </Box>
            );
          })}
        </Box>
      ) : null}
    </Paper>
  );
}
