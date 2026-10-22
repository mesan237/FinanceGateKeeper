import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Select, type SelectOption } from '@/components/Select';

import { EventFormSheet } from './EventFormSheet';
import { useEvents } from './events.hooks';
import type { NewSpendingEvent } from './events.types';

const NONE = 'none';
const NEW = 'new';

export interface EventPickerProps {
  /** The event the expense is tagged with, or null. */
  value: number | null;
  onChange: (eventId: number | null) => void;
}

/**
 * "Event" on the expense log and detail screens (VS-61): which occasion an
 * expense was for, or none. A new event can be created on the spot and is
 * picked at once, so tagging never means leaving the expense half-entered.
 */
export function EventPicker({ value, onChange }: EventPickerProps) {
  const { t } = useTranslation('events');
  const { events, refresh, create } = useEvents();
  const [creating, setCreating] = useState(false);

  // An event made elsewhere (the events screen) shows up when the field mounts.
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const options: SelectOption[] = [
    { key: NONE, label: t('picker.none') },
    ...events.map((e) => ({ key: String(e.id), label: e.name })),
    { key: NEW, label: t('picker.create'), icon: 'add' },
  ];

  const choose = (key: string) => {
    if (key === NEW) {
      setCreating(true);
      return;
    }
    onChange(key === NONE ? null : Number(key));
  };

  const save = async (input: NewSpendingEvent) => {
    const id = await create(input);
    setCreating(false);
    onChange(id);
  };

  return (
    <>
      <Select
        testID="event-picker"
        title={t('picker.label')}
        options={options}
        value={value === null ? NONE : String(value)}
        onChange={choose}
      />
      <EventFormSheet visible={creating} onClose={() => setCreating(false)} onSave={save} />
    </>
  );
}
