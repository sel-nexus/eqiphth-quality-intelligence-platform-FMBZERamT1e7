import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import PersonaContext, { PersonaProvider, usePersona } from '@/context/PersonaContext';
import { getPersonaById } from '@/data/personas';
import { STORAGE_KEYS } from '@/lib/constants';
import LoginPage from './LoginPage';

function SignedIn() {
  const { currentPersona, isAuthenticated } = usePersona();
  const location = useLocation();
  return <p>Signed in successfully: {currentPersona?.name} at {location.pathname} {isAuthenticated ? '(authenticated)' : '(not authenticated)'}</p>;
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <PersonaProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<SignedIn />} />
        </Routes>
      </PersonaProvider>
    </MemoryRouter>
  );
}

function renderControlled(value, entry = '/login') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <PersonaContext.Provider value={value}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="*" element={<SignedIn />} />
        </Routes>
      </PersonaContext.Provider>
    </MemoryRouter>
  );
}

describe('login footer', () => {
  beforeEach(() => {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.SELECTED_PERSONA);
  });
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
    await user.selectOptions(screen.getByLabelText('Persona'), 'qe_manager');
    await user.click(screen.getByRole('button', { name: 'Sign in as Robert Kim' }));
    expect(await screen.findByText('Signed in successfully: Robert Kim at /hth (authenticated)')).toBeVisible();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_PERSONA))).toBe('qe_manager');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN))).toEqual({
      token: 'eqip-mock-qe_manager', at: expect.any(Number),
    });
  });

  it('shows an error and does not sign in when no persona is available', async () => {
    const user = userEvent.setup();
    const login = vi.fn();
    renderControlled({ allPersonas: [], currentPersona: null, isAuthenticated: false, login });
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please select a persona to continue.');
    expect(login).not.toHaveBeenCalled();
    expect(screen.getByRole('contentinfo')).toBeVisible();
    expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
  });

  it('redirects an authenticated persona to the requested path instead of showing login', async () => {
    const login = vi.fn();
    const persona = getPersonaById('qe_manager');
    renderControlled(
      { allPersonas: [persona], currentPersona: persona, isAuthenticated: true, login },
      { pathname: '/login', state: { from: { pathname: '/reports' } } },
    );
    expect(await screen.findByText('Signed in successfully: Robert Kim at /reports (authenticated)')).toBeVisible();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('quick sign-in uses the clicked persona rather than the selected persona', async () => {
    const user = userEvent.setup();
    const selected = getPersonaById('executive_leadership');
    const quick = getPersonaById('qe_manager');
    const login = vi.fn();
    function ControlledQuickLogin() {
      const [currentPersona, setCurrentPersona] = useState(selected);
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const signIn = id => {
        login(id);
        setCurrentPersona(quick);
        setIsAuthenticated(true);
        return quick;
      };
      return (
        <PersonaContext.Provider value={{ allPersonas: [selected, quick], currentPersona, isAuthenticated, login: signIn }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="*" element={<SignedIn />} />
          </Routes>
        </PersonaContext.Provider>
      );
    }
    render(<MemoryRouter initialEntries={['/login']}><ControlledQuickLogin /></MemoryRouter>);
    expect(screen.getByLabelText('Persona')).toHaveValue('executive_leadership');
    await user.click(screen.getByRole('button', { name: /QE Manager/i }));
    expect(login).toHaveBeenCalledOnce();
    expect(login).toHaveBeenCalledWith('qe_manager');
    expect(await screen.findByText('Signed in successfully: Robert Kim at /hth (authenticated)')).toBeVisible();
  });
});
