import { useState } from "react";
import { formatTime } from "@/hooks/useWorkSession";

import type { WorkSession } from "@/integrations/firebase/types";

interface ClockInLocation {
  lat: number;
  lng: number;
  accuracy: number;
  label: string;
  city?: string;
  country?: string;
  capturedAt?: string;
}

interface AdminLocationViewProps {
  session: WorkSession & { userName?: string };
}


export default function AdminLocationView({ session }: AdminLocationViewProps) {
  const loc = session?.clockInLocation;
  const [mapOpen, setMapOpen] = useState(false);

  if (!loc) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <line x1="1" y1="1" x2="23" y2="23" />
          <path d="M16.59 16.59A9 9 0 0 1 3 10c0-2.61 1.1-4.96 2.87-6.65M21 10c0 7-9 13-9 13a23.35 23.35 0 0 1-3.56-3.05" />
        </svg>
        No location
      </span>
    );
  }

  const { lat, lng, label, accuracy, capturedAt } = loc;
  const accuracyLevel = accuracy <= 20 ? "high" : accuracy <= 100 ? "medium" : "low";

  const osmUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005},${lat - 0.005},${lng + 0.005},${lat + 0.005}&layer=mapnik&marker=${lat},${lng}`;
  const osmLink = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-red-500 flex-shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span className="text-xs font-medium truncate" title={label}>
          {label}
        </span>
        <span
          className={`text-[10px] font-semibold px-1 rounded ${
            accuracyLevel === "high"
              ? "bg-green-100 text-green-800"
              : accuracyLevel === "medium"
              ? "bg-yellow-100 text-yellow-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          ±{accuracy}m
        </span>
      </div>
      <button
        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
        onClick={() => setMapOpen((v) => !v)}
      >
        {mapOpen ? "Hide map" : "View map"}
        <svg
          className="w-3 h-3 transition-transform"
          style={{ transform: mapOpen ? "rotate(180deg)" : "rotate(0)" }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {mapOpen && (
        <div className="mt-1">
          <iframe
            title={`Clock-in location for ${session.userName || "user"}`}
            src={osmUrl}
            width="100%"
            height="150"
            className="rounded-md border border-border"
            loading="lazy"
          />
          <div className="flex justify-between text-xs mt-1">
            <span className="font-mono text-muted-foreground">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </span>
            <a
              href={osmLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Open in OSM ↗
            </a>
          </div>
        </div>
      )}

      <div className="text-[10px] text-muted-foreground">
        {capturedAt
          ? new Date(capturedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
          : ""}
      </div>
    </div>
  );
}
