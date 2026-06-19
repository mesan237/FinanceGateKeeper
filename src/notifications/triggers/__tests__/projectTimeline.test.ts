import { buildProjectTimelineAlert } from '@/notifications/triggers/projectTimeline';

describe('buildProjectTimelineAlert', () => {
  it('builds a project-timeline payload with non-empty copy', () => {
    const payload = buildProjectTimelineAlert({
      previous: '2026-09-15',
      next: '2026-10-15',
      shiftedMonths: 1,
    });
    expect(payload.type).toBe('projectTimeline');
    expect(payload.title.length).toBeGreaterThan(0);
    expect(payload.body.length).toBeGreaterThan(0);
  });
});
