import { MESSAGES } from '@/notifications/notifications.config';
import type { NotificationPayload } from '@/notifications/notifications.types';

/**
 * The shift data this trigger formats. Declared locally (structurally
 * compatible with the projects feature's `TimelineShift`) because
 * `notifications/` must not import from `features/` — features pass their shift
 * object in and it duck-types onto this shape.
 */
export interface ProjectTimelineInput {
  previous: string | null;
  next: string | null;
  shiftedMonths: number;
}

/**
 * Builds the project-timeline-shift alert payload. Pure — returns the payload
 * only; the feature passes it to `notifications.service.scheduleNotification`.
 * Does not touch the database.
 */
export function buildProjectTimelineAlert(_shift: ProjectTimelineInput): NotificationPayload {
  return {
    type: 'projectTimeline',
    title: MESSAGES.projectTimeline.title,
    body: MESSAGES.projectTimeline.body,
  };
}
