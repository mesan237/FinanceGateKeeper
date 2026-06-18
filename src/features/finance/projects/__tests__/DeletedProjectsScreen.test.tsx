import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { DeletedProject } from '@/features/finance/projects/projects.types';

jest.mock('@/features/finance/projects/projects.hooks', () => ({
  useDeletedProjects: jest.fn(),
}));

import { DeletedProjectsScreen } from '@/features/finance/projects/DeletedProjectsScreen';
import { useDeletedProjects } from '@/features/finance/projects/projects.hooks';

const mockedUseDeleted = useDeletedProjects as jest.MockedFunction<typeof useDeletedProjects>;

const restore = jest.fn();

// Deleted "now" so two full recovery days remain (window is 3 days).
const recentlyDeleted = (over: Partial<DeletedProject> = {}): DeletedProject => ({
  id: 1,
  name: 'E-commerce Launch',
  targetAmount: 500000,
  fundedAmount: 0,
  priorityRank: 1,
  deadline: null,
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
  deletedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  ...over,
});

function mockState(over: Partial<ReturnType<typeof useDeletedProjects>> = {}) {
  mockedUseDeleted.mockReturnValue({
    deleted: [recentlyDeleted()],
    loading: false,
    error: null,
    refresh: jest.fn(),
    restore,
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState();
});

describe('DeletedProjectsScreen', () => {
  it('lists deleted projects with the remaining recovery window', () => {
    render(<DeletedProjectsScreen />);
    expect(screen.getByText('E-commerce Launch')).toBeTruthy();
    expect(screen.getByText(/Deletes in 2 days/)).toBeTruthy();
  });

  it('restores a project when Restore is pressed', () => {
    render(<DeletedProjectsScreen />);
    fireEvent.press(screen.getByTestId('restore-1'));
    expect(restore).toHaveBeenCalledWith(1);
  });

  it('shows an empty state when nothing is deleted', () => {
    mockState({ deleted: [] });
    render(<DeletedProjectsScreen />);
    expect(screen.getByText(/Nothing here/)).toBeTruthy();
  });
});
