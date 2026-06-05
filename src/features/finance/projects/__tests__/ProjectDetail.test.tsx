import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';

import type { Project, ProjectTransaction } from '@/features/finance/projects/projects.types';

jest.mock('@/features/finance/projects/projects.hooks', () => ({
  useProjectDetail: jest.fn(),
}));

import { ProjectDetail } from '@/features/finance/projects/ProjectDetail';
import { useProjectDetail } from '@/features/finance/projects/projects.hooks';

const mockedUseProjectDetail = useProjectDetail as jest.MockedFunction<typeof useProjectDetail>;

const BRVM: Project = {
  id: 1,
  name: 'BRVM Investment',
  targetAmount: 200000,
  fundedAmount: 120000,
  priorityRank: 1,
  deadline: null,
  status: 'active',
  createdAt: '2026-06-01T00:00:00.000Z',
};
const TXNS: ProjectTransaction[] = [
  {
    id: 2,
    projectId: 1,
    amount: 20000,
    date: '2026-06-04',
    source: 'manual',
    createdAt: '2026-06-04T00:00:00.000Z',
  },
  {
    id: 1,
    projectId: 1,
    amount: 100000,
    date: '2026-06-02',
    source: 'allocation',
    createdAt: '2026-06-02T00:00:00.000Z',
  },
];

const setStatus = jest.fn();
const contribute = jest.fn();

function mockState(over: Partial<ReturnType<typeof useProjectDetail>> = {}) {
  mockedUseProjectDetail.mockReturnValue({
    project: BRVM,
    transactions: TXNS,
    loading: false,
    error: null,
    refresh: jest.fn(),
    setStatus,
    contribute,
    ...over,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockState();
});

describe('ProjectDetail', () => {
  it('renders the project, progress, and funding history', () => {
    render(<ProjectDetail projectId={1} />);
    expect(screen.getByText('BRVM Investment')).toBeTruthy();
    expect(screen.getByTestId('project-detail-progress-fill').props.accessibilityValue.now).toBe(60);
    expect(screen.getByText('Allocation 2026-06')).toBeTruthy();
  });

  it('pauses an active project', () => {
    render(<ProjectDetail projectId={1} />);
    fireEvent.press(screen.getByRole('button', { name: 'Pause' }));
    expect(setStatus).toHaveBeenCalledWith('paused');
  });

  it('resumes a paused project', () => {
    mockState({ project: { ...BRVM, status: 'paused' } });
    render(<ProjectDetail projectId={1} />);
    fireEvent.press(screen.getByRole('button', { name: 'Resume' }));
    expect(setStatus).toHaveBeenCalledWith('active');
  });

  it('logs a manual contribution', async () => {
    render(<ProjectDetail projectId={1} />);
    fireEvent.press(screen.getByRole('button', { name: 'Add funds' }));
    fireEvent.changeText(screen.getByTestId('contribution-amount'), '15000');
    fireEvent.press(screen.getByRole('button', { name: 'Confirm contribution' }));
    await waitFor(() => expect(contribute).toHaveBeenCalledWith(15000));
  });
});
