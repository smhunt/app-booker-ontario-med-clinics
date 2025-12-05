import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '../Alert';

describe('Alert', () => {
  it('should render children', () => {
    render(<Alert>Test message</Alert>);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('should have role alert', () => {
    render(<Alert>Test message</Alert>);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('should apply info styles by default', () => {
    render(<Alert>Info message</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-blue-50');
  });

  it('should apply error styles', () => {
    render(<Alert type="error">Error message</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-red-50');
  });

  it('should apply success styles', () => {
    render(<Alert type="success">Success message</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-green-50');
  });

  it('should apply warning styles', () => {
    render(<Alert type="warning">Warning message</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveClass('bg-yellow-50');
  });

  it('should call onClose when close button is clicked', () => {
    const handleClose = vi.fn();
    render(<Alert onClose={handleClose}>Message with close</Alert>);

    const closeButton = screen.getByLabelText('Close alert');
    fireEvent.click(closeButton);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('should not show close button when onClose is not provided', () => {
    render(<Alert>Message without close</Alert>);
    expect(screen.queryByLabelText('Close alert')).not.toBeInTheDocument();
  });

  it('should have aria-live assertive for errors', () => {
    render(<Alert type="error">Error</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'assertive');
  });

  it('should have aria-live polite for non-errors', () => {
    render(<Alert type="info">Info</Alert>);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveAttribute('aria-live', 'polite');
  });
});
