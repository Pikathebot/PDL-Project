import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import App from '../App';

describe('Sentinel App Shell', () => {
  it('renders branding header title', () => {
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );
    expect(screen.getByText(/SENTINEL/i)).toBeInTheDocument();
  });
});
