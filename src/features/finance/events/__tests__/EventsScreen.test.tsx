import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => cb(), [cb]);
    },
  };
});

jest.mock('@/features/finance/events/events.service', () => ({
  getEvents: jest.fn(),
  createEvent: jest.fn().mockResolvedValue(7),
}));

import { EventsScreen } from '@/features/finance/events/EventsScreen';
import * as service from '@/features/finance/events/events.service';

const mocked = service as jest.Mocked<typeof service>;

const WEDDING = { id: 1, name: 'Marie’s wedding', date: '2026-11-07', createdAt: '', total: 43_000, count: 3 };
const TRIP = { id: 2, name: 'Trip to Kribi', date: null, createdAt: '', total: 0, count: 0 };

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getEvents.mockResolvedValue([WEDDING, TRIP]);
});

describe('EventsScreen (VS-61)', () => {
  it('lists each event with what it cost', async () => {
    render(<EventsScreen />);

    expect(await screen.findByTestId('event-row-1')).toHaveTextContent(/Marie’s wedding.*3 expenses.*43.000 FCFA/);
    expect(screen.getByTestId('event-row-2')).toHaveTextContent(/No date/);
  });

  it('opens an event', async () => {
    render(<EventsScreen />);

    fireEvent.press(await screen.findByTestId('event-row-1'));

    expect(mockPush).toHaveBeenCalledWith('/events/1');
  });

  it('explains events when there are none yet', async () => {
    mocked.getEvents.mockResolvedValue([]);
    render(<EventsScreen />);

    expect(await screen.findByTestId('events-empty')).toBeTruthy();
  });

  it('creates an event and opens it', async () => {
    render(<EventsScreen />);
    fireEvent.press(await screen.findByTestId('events-add'));

    fireEvent.changeText(await screen.findByTestId('event-form-name'), 'Funeral');
    fireEvent.press(screen.getByTestId('event-form-save'));

    await waitFor(() => expect(mocked.createEvent).toHaveBeenCalledWith({ name: 'Funeral', date: null }));
    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/events/7'));
  });
});
