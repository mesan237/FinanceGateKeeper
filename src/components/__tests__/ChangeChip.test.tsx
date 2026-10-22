import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { ChangeChip } from '@/components/ChangeChip';

describe('ChangeChip', () => {
  it('signs a rise and a fall', () => {
    render(
      <>
        <ChangeChip testID="up" change={50} />
        <ChangeChip testID="down" change={-25} />
        <ChangeChip testID="flat" change={0} />
      </>,
    );

    expect(screen.getByTestId('up')).toHaveTextContent('+50%');
    expect(screen.getByTestId('down')).toHaveTextContent('−25%');
    expect(screen.getByTestId('flat')).toHaveTextContent('0%');
  });

  it('reads "New" when there was nothing to compare with', () => {
    render(<ChangeChip testID="new" change={null} />);

    expect(screen.getByTestId('new')).toHaveTextContent('New');
  });
});
