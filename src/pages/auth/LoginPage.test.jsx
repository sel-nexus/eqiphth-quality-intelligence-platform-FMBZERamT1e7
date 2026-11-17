import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PersonaProvider } from '@/context/PersonaContext';
import LoginPage from './LoginPage';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <PersonaProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<p>Signed in successfully</p>} />
        </Routes>
      </PersonaProvider>
    </MemoryRouter>
  );
}

describe('login footer', () => {
  it('shows the fixed copyright notice as a footer', () => {
    renderLogin();
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2026-27. All rights reserved.');
  });

  it('keeps the persona and password controls available', async () => {
    const user = userEvent.setup();
    renderLogin();
    const select = screen.getByLabelText('Persona');
    expect(select.options.length).toBeGreaterThan(1);
    await user.selectOptions(select, select.options[1].value);
    await user.type(screen.getByLabelText('Password'), 'demo');
    expect(screen.getByLabelText('Password')).toHaveValue('demo');
    expect(screen.getByLabelText('Email (derived from persona)').value).toMatch(/@humana\.com$/);
    expect(screen.getByRole('contentinfo')).toBeVisible();
  });

  it('still signs in with an empty demo password', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /^sign in as/i }));
    expect(await screen.findByText('Signed in successfully')).toBeVisible();
  });
});
