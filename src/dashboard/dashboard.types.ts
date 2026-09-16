import type { ReactNode } from "react";

export interface Metric {
  label: string;

  value: string;

  detail: string;

  accent: string;

  icon: ReactNode;

  source: "live" | "preview";
}

export interface TripRow {
  route: string;

  vehicle: string;

  driver: string;

  time: string;

  status: "Active" | "Scheduled" | "Delayed";
}

export interface IncidentRow {
  title: string;

  time: string;

  severity: "Low" | "Medium" | "High";
}
