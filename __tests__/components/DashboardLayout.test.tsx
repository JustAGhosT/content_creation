import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, jest, test } from '@jest/globals';

jest.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({ isAuthenticated: true, isLoading: false }),
}));
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/components/ui/Header', () => ({
  __esModule: true,
  default: () => <header data-testid="dashboard-header" />,
}));
jest.mock('@/components/ui/ErrorBoundary', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const DashboardLayout = require('../../app/(dashboard)/layout').default as React.ComponentType<{
  children: React.ReactNode;
}>;

describe('DashboardLayout', () => {
  test('owns one authenticated header and main landmark', () => {
    render(
      <DashboardLayout>
        <p>Dashboard content</p>
      </DashboardLayout>
    );

    expect(screen.getAllByTestId('dashboard-header')).toHaveLength(1);
    expect(screen.getAllByRole('main')).toHaveLength(1);
    expect(screen.getByRole('link', { name: 'Skip to main content' }).getAttribute('href')).toBe(
      '#main-content'
    );
    expect(screen.getByRole('main').getAttribute('id')).toBe('main-content');
    expect(screen.queryByText('Dashboard content')).not.toBeNull();
  });
});
