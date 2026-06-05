import { fireEvent, render, screen } from '@testing-library/react-native';
import React from 'react';

import type { Project, TimelineEstimate } from '@/features/finance/projects/projects.types';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn() }),
}));

jest.mock('@/features/finance/projects/projects.hooks', () => ({
  useProjects: jest.fn(),
}));

import { ProjectListScreen } from '@/features/finance/projects/ProjectListScreen';
import { useProjects } from '@/features/finance/projects/projects.hooks';

const mockedUseProjects = useProjects as jest.MockedFunction<typeof useProjects>;

const BRVM: Project = {
  id: 1,
  name: 'BRVM Investment',
  targetAmount: 200000,
  fundedAmount: 100000,
  priorityRank: 1,
  deadline: null,
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
};
const ECOM: Project = {
  id: 2,
  name: 'E-commerce Launch',
  targetAmount: 500000,
  fundedAmount: 0,
  priorityRank: 2,
  deadline: null,
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
};
const TIMELINES: TimelineEstimate[] = [
  { projectId: 1, monthsRemaining: 4, completionDate: '2026-10-15' },
  { projectId: 2, monthsRemaining: null, completionDate: null },
];

function mockState(over: Partial<ReturnType<typeof useProjects>> = {}) {
  mockedUseProjects.mockReturnValue({
    projects: [BRVM, ECOM],
    timelines: TIMELINES,
    monthlyRate: 25000,
    loading: false,
    error: null,
    refresh: jest.fn(),
    reorder: jest.fn(),
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState();
});

describe('ProjectListScreen', () => {
  it('renders projects ranked with progress and completion dates', () => {
    render(<ProjectListScreen />);

    expect(screen.getByText('BRVM Investment')).toBeTruthy();
    expect(screen.getByText('E-commerce Launch')).toBeTruthy();
    // BRVM progress 100000/200000 = 50%.
    expect(screen.getByTestId('project-progress-1-fill').props.accessibilityValue.now).toBe(50);
    expect(screen.getByText('100 000 FCFA / 200 000 FCFA')).toBeTruthy();
  });

  it('navigates to the create form from the Add button', () => {
    render(<ProjectListScreen />);
    fireEvent.press(screen.getByRole('button', { name: 'Add project' }));
    expect(mockPush).toHaveBeenCalledWith('/projects/create');
  });

  it('navigates to a project detail when a row is pressed', () => {
    render(<ProjectListScreen />);
    fireEvent.press(screen.getByTestId('project-row-1'));
    expect(mockPush).toHaveBeenCalledWith('/projects/1');
  });

  it('shows an empty state when there are no projects', () => {
    mockState({ projects: [], timelines: [] });
    render(<ProjectListScreen />);
    expect(screen.getByText('No projects yet. Add one to start funding it.')).toBeTruthy();
  });
});
