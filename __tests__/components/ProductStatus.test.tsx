import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, test } from '@jest/globals';
import ProductStatus from '@/components/ui/ProductStatus';
import { productStatus } from '@/lib/product-status';

describe('ProductStatus', () => {
  test.each(['signIn', 'header', 'footer'] as const)(
    'uses the centralized status contract for the %s surface',
    variant => {
      render(<ProductStatus variant={variant} showDescription />);

      expect(screen.getByLabelText(productStatus.accessibleLabel).textContent).toContain(
        productStatus.label
      );
      expect(screen.getByText(productStatus.description)).not.toBeNull();
    }
  );

  test('keeps the compact header marker free of duplicate explanatory copy', () => {
    render(<ProductStatus variant="header" />);

    expect(screen.getByLabelText(productStatus.accessibleLabel)).not.toBeNull();
    expect(screen.queryByText(productStatus.description)).toBeNull();
  });
});
