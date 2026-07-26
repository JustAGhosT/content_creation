import { render, screen } from '@testing-library/react';
import PerformanceDashboardPage from '../../app/(dashboard)/dashboard/page';

describe('PerformanceDashboardPage', () => {
  test('shows an honest empty state until verified provider telemetry exists', () => {
    render(<PerformanceDashboardPage />);

    expect(screen.getByText('0 platforms reporting')).toBeInTheDocument();
    expect(screen.getByText('No verified activity yet')).toBeInTheDocument();
    expect(screen.getByLabelText('No verified engagement data')).toHaveTextContent('—');
    expect(screen.getByText('No verified engagement data yet')).toBeInTheDocument();
    expect(screen.getByText('No provider telemetry is ingested')).toBeInTheDocument();
  });

  test('does not present demo engagement or browser-only integration state as live data', () => {
    const { container } = render(<PerformanceDashboardPage />);

    expect(container).not.toHaveTextContent('5,000');
    expect(container).not.toHaveTextContent('Instagram leads');
    expect(container).not.toHaveTextContent('Airtable sync');
    expect(screen.queryByRole('button', { name: /refresh data/i })).not.toBeInTheDocument();
  });
});
