import { act, fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import { LanguageToggle } from '@/components/LanguageToggle';
import i18n from '@/i18n';

describe('LanguageToggle (VS-86)', () => {
  it('shows FR and EN and marks the active language', () => {
    render(<LanguageToggle value="fr" onChange={jest.fn()} testID="lang" />);
    expect(screen.getByText('FR')).toBeTruthy();
    expect(screen.getByText('EN')).toBeTruthy();
    expect(screen.getByTestId('lang-fr').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: true }),
    );
    expect(screen.getByTestId('lang-en').props.accessibilityState).toEqual(
      expect.objectContaining({ selected: false }),
    );
  });

  it('names each language in its own language for screen readers', () => {
    render(<LanguageToggle value="fr" onChange={jest.fn()} testID="lang" />);
    expect(screen.getByLabelText('Français')).toBeTruthy();
    expect(screen.getByLabelText('English')).toBeTruthy();
  });

  it('reports the language tapped, and ignores a tap on the active one', () => {
    const onChange = jest.fn();
    render(<LanguageToggle value="fr" onChange={onChange} testID="lang" />);
    fireEvent.press(screen.getByTestId('lang-fr'));
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.press(screen.getByTestId('lang-en'));
    expect(onChange).toHaveBeenCalledWith('en');
  });

  it('labels the group in the active language', async () => {
    render(<LanguageToggle value="en" onChange={jest.fn()} testID="lang" />);
    expect(screen.getByLabelText('Language')).toBeTruthy();
    await act(() => i18n.changeLanguage('fr'));
    expect(screen.getByLabelText('Langue')).toBeTruthy();
  });
});
