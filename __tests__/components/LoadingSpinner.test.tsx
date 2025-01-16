import React from 'react';
import { render } from '@testing-library/react';
import LoadingSpinner from '@/components/shared/LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders without crashing', () => {
    const { container } = render(<LoadingSpinner />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('has the correct styling', () => {
    const { container } = render(<LoadingSpinner />);
    const spinner = container.firstChild;
    expect(spinner).toHaveClass('animate-spin');
  });
});
