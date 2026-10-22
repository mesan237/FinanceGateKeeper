import { useLocalSearchParams } from 'expo-router';
import React from 'react';

import { EventDetailScreen } from './EventDetailScreen';

/** Reads the event `id` param and renders its page (VS-61). */
export function EventDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EventDetailScreen eventId={Number(id)} />;
}
