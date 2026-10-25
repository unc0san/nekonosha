import type { ComponentType } from "react";
import PresidentSuite from "./president-suite";
import WorkStudio from "./work-studio";
import MeetingRoom from "./meeting-room";
import Reception from "./reception";
import Lounge from "./lounge";
import type { OfficeTask } from "./staff";

export type OfficeArea = { id: string; label: string; Component: ComponentType<{ department: string; tasks: OfficeTask[] }> };

// Every new-design area takes the same props, so the dashboard (and later a combined office map) can list them generically.
export const OFFICE_AREAS: OfficeArea[] = [
  { id: "suite", label: "社長室", Component: PresidentSuite },
  { id: "studio", label: "作業スペース", Component: WorkStudio },
  { id: "meeting", label: "会議室", Component: MeetingRoom },
  { id: "reception", label: "受付", Component: Reception },
  { id: "lounge", label: "ラウンジ", Component: Lounge },
];
