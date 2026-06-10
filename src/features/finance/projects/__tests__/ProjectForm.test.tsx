import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
}));

jest.mock('@/features/finance/projects/projects.service', () => ({
  createProject: jest.fn(),
}));

import { ProjectForm } from '@/features/finance/projects/ProjectForm';
import * as projectsService from '@/features/finance/projects/projects.service';

const mockedCreate = projectsService.createProject as jest.MockedFunction<
  typeof projectsService.createProject
>;

beforeEach(() => {
  jest.clearAllMocks();
  mockedCreate.mockResolvedValue(1);
});

describe('ProjectForm', () => {
  it('disables save until a name and a positive target are entered', () => {
    render(<ProjectForm />);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.changeText(screen.getByTestId('project-name'), 'BRVM Investment');
    fireEvent.changeText(screen.getByTestId('project-target'), '200000');
    expect(save).toBeEnabled();
  });

  it('creates the project and navigates back to the list on save', async () => {
    render(<ProjectForm />);
    fireEvent.changeText(screen.getByTestId('project-name'), 'BRVM Investment');
    fireEvent.changeText(screen.getByTestId('project-target'), '200000');
    fireEvent.press(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() =>
      expect(mockedCreate).toHaveBeenCalledWith({
        name: 'BRVM Investment',
        targetAmount: 200000,
        deadline: null,
      }),
    );
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/(tabs)/projects'));
  });

  it('does not save a zero target', () => {
    render(<ProjectForm />);
    fireEvent.changeText(screen.getByTestId('project-name'), 'X');
    fireEvent.changeText(screen.getByTestId('project-target'), '0');
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});
