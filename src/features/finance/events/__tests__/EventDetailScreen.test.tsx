import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual<typeof import('react')>('react');
  return {
    useRouter: () => ({ push: mockPush, back: mockBack, replace: jest.fn() }),
    useFocusEffect: (cb: () => void) => {
      ReactModule.useEffect(() => cb(), [cb]);
    },
  };
});

jest.mock('@/features/finance/events/events.service', () => ({
  getEventDetail: jest.fn(),
  updateEvent: jest.fn().mockResolvedValue(undefined),
  deleteEvent: jest.fn().mockResolvedValue(undefined),
}));

import { EventDetailScreen } from '@/features/finance/events/EventDetailScreen';
import * as service from '@/features/finance/events/events.service';

const mocked = service as jest.Mocked<typeof service>;

const DETAIL = {
  event: { id: 1, name: 'Marie’s wedding', date: '2026-11-07', createdAt: '' },
  total: 39_000,
  byCategory: [
    { categoryId: 1, categoryLabel: 'Food', amount: 20_000 },
    { categoryId: 5, categoryLabel: 'Transport', amount: 19_000 },
  ],
  expenses: [
    { id: 31, amount: -1_000, date: '2026-11-08', note: null, categoryLabel: 'Food', subcategoryLabel: null, refundOf: 30 },
    { id: 30, amount: 21_000, date: '2026-11-07', note: 'Gift basket', categoryLabel: 'Food', subcategoryLabel: null, refundOf: null },
    { id: 32, amount: 19_000, date: '2026-11-07', note: null, categoryLabel: 'Transport', subcategoryLabel: 'Taxi', refundOf: null },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getEventDetail.mockResolvedValue(DETAIL);
});

describe('EventDetailScreen (VS-61)', () => {
  it('shows what the event cost, split by category', async () => {
    render(<EventDetailScreen eventId={1} />);

    expect(await screen.findByTestId('event-total')).toHaveTextContent(/39.000 FCFA/);
    expect(screen.getByTestId('screen-header-title')).toHaveTextContent('Marie’s wedding');
    expect(screen.getByTestId('event-category-1')).toHaveTextContent(/Food.*20.000 FCFA/);
    expect(screen.getByTestId('event-category-5')).toHaveTextContent(/Transport.*19.000 FCFA/);
  });

  it('lists its expenses and opens one; a refund opens its purchase', async () => {
    render(<EventDetailScreen eventId={1} />);

    expect(await screen.findByTestId('event-expense-30')).toHaveTextContent(/Gift basket/);
    expect(screen.getByTestId('event-expense-32')).toHaveTextContent(/Taxi/);
    fireEvent.press(screen.getByTestId('event-expense-32'));
    expect(mockPush).toHaveBeenCalledWith('/expenses/32');

    fireEvent.press(screen.getByTestId('event-expense-31'));
    expect(mockPush).toHaveBeenCalledWith('/expenses/30');
  });

  it('renames the event', async () => {
    render(<EventDetailScreen eventId={1} />);
    fireEvent.press(await screen.findByTestId('event-edit'));

    fireEvent.changeText(await screen.findByTestId('event-form-name'), 'Wedding of Marie');
    fireEvent.press(screen.getByTestId('event-form-save'));

    await waitFor(() =>
      expect(mocked.updateEvent).toHaveBeenCalledWith(1, { name: 'Wedding of Marie', date: '2026-11-07' }),
    );
  });

  it('deletes the event after confirming, then goes back', async () => {
    render(<EventDetailScreen eventId={1} />);
    fireEvent.press(await screen.findByTestId('event-delete'));
    fireEvent.press(await screen.findByTestId('event-delete-confirm'));

    await waitFor(() => expect(mocked.deleteEvent).toHaveBeenCalledWith(1));
    expect(mockBack).toHaveBeenCalled();
  });

  it('says so when the event no longer exists', async () => {
    mocked.getEventDetail.mockResolvedValue(null);
    render(<EventDetailScreen eventId={9} />);

    expect(await screen.findByTestId('event-missing')).toBeTruthy();
  });
});
