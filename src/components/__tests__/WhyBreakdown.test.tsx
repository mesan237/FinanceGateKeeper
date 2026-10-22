import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { WhyBreakdown } from '@/components/WhyBreakdown';

const TOTALS = { routine: 20_000, event: 15_000, unexpected: 3_000, everyday: 7_000 };

describe('WhyBreakdown (VS-62)', () => {
  it('shows each reason with its amount and share', () => {
    render(<WhyBreakdown totals={TOTALS} />);

    expect(screen.getByTestId('why-routine')).toHaveTextContent(/Routine.*20.000 FCFA.*44%/);
    expect(screen.getByTestId('why-event')).toHaveTextContent(/Events.*15.000 FCFA.*33%/);
    expect(screen.getByTestId('why-unexpected')).toHaveTextContent(/Unexpected/);
    expect(screen.getByTestId('why-everyday')).toHaveTextContent(/Everyday.*7.000 FCFA.*16%/);
  });

  it('leaves out a reason with nothing in it', () => {
    render(<WhyBreakdown totals={{ ...TOTALS, unexpected: 0 }} />);

    expect(screen.queryByTestId('why-unexpected')).toBeNull();
  });

  it('lists the events under "Events" and opens one', () => {
    const onOpenEvent = jest.fn();
    render(
      <WhyBreakdown
        totals={TOTALS}
        events={[{ eventId: 4, name: 'Marie’s wedding', amount: 15_000 }]}
        onOpenEvent={onOpenEvent}
      />,
    );

    expect(screen.getByTestId('why-event-4')).toHaveTextContent(/Marie’s wedding.*15.000 FCFA/);
    fireEvent.press(screen.getByTestId('why-event-4'));
    expect(onOpenEvent).toHaveBeenCalledWith(4);
  });

  it('renders nothing without any spending', () => {
    render(<WhyBreakdown totals={{ routine: 0, event: 0, unexpected: 0, everyday: 0 }} />);

    expect(screen.queryByTestId('why')).toBeNull();
  });
});
