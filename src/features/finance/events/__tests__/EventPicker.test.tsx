import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

jest.mock('@/features/finance/events/events.service', () => ({
  getEvents: jest.fn(),
  createEvent: jest.fn().mockResolvedValue(7),
}));

import { EventPicker } from '@/features/finance/events/EventPicker';
import * as service from '@/features/finance/events/events.service';

const mocked = service as jest.Mocked<typeof service>;

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getEvents.mockResolvedValue([
    { id: 1, name: 'Marie’s wedding', date: '2026-11-07', createdAt: '', total: 0, count: 0 },
  ]);
});

describe('EventPicker (VS-61)', () => {
  it('shows "No event" until one is picked', async () => {
    render(<EventPicker value={null} onChange={jest.fn()} />);

    expect(await screen.findByTestId('event-picker-trigger')).toHaveTextContent(/No event/);
  });

  it('shows the event an expense is tagged with', async () => {
    render(<EventPicker value={1} onChange={jest.fn()} />);

    await waitFor(() => expect(screen.getByTestId('event-picker-trigger')).toHaveTextContent(/Marie’s wedding/));
  });

  it('picks an event, or clears it', async () => {
    const onChange = jest.fn();
    render(<EventPicker value={null} onChange={onChange} />);

    fireEvent.press(await screen.findByTestId('event-picker-trigger'));
    fireEvent.press(await screen.findByTestId('event-picker-option-1'));
    expect(onChange).toHaveBeenLastCalledWith(1);

    fireEvent.press(screen.getByTestId('event-picker-trigger'));
    fireEvent.press(await screen.findByTestId('event-picker-option-none'));
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('creates an event on the spot and picks it', async () => {
    const onChange = jest.fn();
    render(<EventPicker value={null} onChange={onChange} />);

    fireEvent.press(await screen.findByTestId('event-picker-trigger'));
    fireEvent.press(await screen.findByTestId('event-picker-option-new'));
    fireEvent.changeText(await screen.findByTestId('event-form-name'), 'Funeral');
    fireEvent.press(screen.getByTestId('event-form-save'));

    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(7));
    expect(mocked.createEvent).toHaveBeenCalledWith({ name: 'Funeral', date: null });
  });
});
