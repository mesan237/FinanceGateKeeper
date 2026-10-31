import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('@/features/finance/income/incomeSources.service', () => ({
  getIncomeSources: jest.fn(),
  createIncomeSource: jest.fn(),
  renameIncomeSource: jest.fn(),
  setIncomeSourceHidden: jest.fn(),
}));

import { IncomeSourcePicker } from '@/features/finance/income/IncomeSourcePicker';
import type { IncomeSource } from '@/features/finance/income/income.types';
import * as service from '@/features/finance/income/incomeSources.service';
import i18n from '@/i18n';

const mocked = service as jest.Mocked<typeof service>;

const source = (id: number, key: IncomeSource['key'], name: string, parentId: number | null = null, isHidden = false) => ({
  id,
  key,
  name,
  parentId,
  isHidden,
  sortOrder: id,
});

const SOURCES: IncomeSource[] = [
  source(1, 'salary', 'Salary'),
  source(2, 'freelance', 'Freelance'),
  source(3, 'business', 'Business'),
  source(4, 'gift', 'Gift & family support'),
  source(5, 'other', 'Other', null, true),
  source(6, 'ecommerce', 'E-commerce', 3),
  source(7, null, 'Taxi', 3, true),
];

beforeEach(() => {
  jest.clearAllMocks();
  mocked.getIncomeSources.mockResolvedValue(SOURCES);
});

async function renderPicker(value: number | null, onChange = jest.fn()) {
  render(<IncomeSourcePicker value={value} onChange={onChange} />);
  await screen.findByRole('button', { name: 'Salary' });
  return onChange;
}

describe('IncomeSourcePicker', () => {
  it('shows each visible top-level source and a New source pill, not the hidden ones', async () => {
    await renderPicker(null);

    for (const name of ['Salary', 'Freelance', 'Business / side business', 'Gift & family support', 'New source']) {
      expect(screen.getByRole('button', { name })).toBeTruthy();
    }
    expect(screen.queryByRole('button', { name: 'Other' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'E-commerce' })).toBeNull();
  });

  it('labels the built-in sources in French when the app is in French', async () => {
    await renderPicker(null);
    await act(async () => {
      await i18n.changeLanguage('fr');
    });

    expect(screen.getByRole('button', { name: 'Salaire' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Activité / commerce' })).toBeTruthy();
    await act(async () => {
      await i18n.changeLanguage('en');
    });
  });

  it('calls onChange with the source id and marks the selected pill', async () => {
    const onChange = await renderPicker(1);

    expect(screen.getByRole('button', { name: 'Salary' }).props.accessibilityState.selected).toBe(true);
    fireEvent.press(screen.getByRole('button', { name: 'Freelance' }));
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('offers the subsources once their source is picked; tapping the picked one goes back to the source', async () => {
    const onChange = await renderPicker(6);

    expect(screen.getByText('Under Business / side business (optional)')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Business / side business' }).props.accessibilityState.selected).toBe(true);
    const ecommerce = screen.getByRole('button', { name: 'E-commerce' });
    expect(ecommerce.props.accessibilityState.selected).toBe(true);
    expect(screen.queryByRole('button', { name: 'Taxi' })).toBeNull();

    fireEvent.press(ecommerce);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('still shows a hidden source an existing entry uses', async () => {
    await renderPicker(7);

    expect(screen.getByRole('button', { name: 'Taxi' }).props.accessibilityState.selected).toBe(true);
  });

  it('explains what counts as income under Gift & family support', async () => {
    await renderPicker(4);

    expect(screen.getByText(/A loan you must pay back is a debt/)).toBeTruthy();
  });

  it('adds a source of the user’s own and selects it', async () => {
    mocked.createIncomeSource.mockResolvedValue(8);
    const onChange = await renderPicker(null);

    fireEvent.press(screen.getByRole('button', { name: 'New source' }));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Pension');
    fireEvent.press(screen.getByTestId('income-source-save'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(8));
    expect(mocked.createIncomeSource).toHaveBeenCalledWith('Pension', null);
  });

  it('adds a subsource under the picked source', async () => {
    mocked.createIncomeSource.mockResolvedValue(9);
    const onChange = await renderPicker(3);

    fireEvent.press(screen.getByRole('button', { name: 'Add under Business / side business' }));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Shop');
    fireEvent.press(screen.getByTestId('income-source-save'));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(9));
    expect(mocked.createIncomeSource).toHaveBeenCalledWith('Shop', 3);
  });

  it('keeps the form open with the reason when the name is refused', async () => {
    mocked.createIncomeSource.mockRejectedValue(new Error('“Salary” already exists here.'));
    const onChange = await renderPicker(null);

    fireEvent.press(screen.getByRole('button', { name: 'New source' }));
    fireEvent.changeText(screen.getByLabelText('Name'), 'Salary');
    fireEvent.press(screen.getByTestId('income-source-save'));

    expect(await screen.findByText('“Salary” already exists here.')).toBeTruthy();
    expect(screen.getByLabelText('Name')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('opens the manage screen', async () => {
    await renderPicker(null);

    fireEvent.press(screen.getByRole('button', { name: 'Manage sources' }));
    expect(mockPush).toHaveBeenCalledWith('/income/sources');
  });
});
