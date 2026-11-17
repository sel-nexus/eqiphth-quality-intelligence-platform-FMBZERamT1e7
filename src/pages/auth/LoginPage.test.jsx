/** Verify the literal notice and the existing stateful demo sign-in journeys. */
import '@testing-library/jest-dom/vitest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import PersonaContext, { PersonaProvider, usePersona } from '@/context/PersonaContext';
import { getPersonaById } from '@/data/personas';
import { ROUTES, STORAGE_KEYS } from '@/lib/constants';
import LoginPage from './LoginPage';

const NOTICE = '© 2026-27 all rights reserved';
const FOCUSABLES = 'a[href], button, input, select, textarea, [tabindex], [contenteditable="true"]';

/** Expose the destination and real provider session as observable route output. */
function Destination() {
  const { pathname } = useLocation();
  const { currentPersona, isAuthenticated } = usePersona();
  return (
    <div>
      <h1>Destination: {pathname}</h1>
      <p>{isAuthenticated ? `Authenticated: ${currentPersona.name}` : 'Unauthenticated'}</p>
    </div>
  );
}

/** Mount login within the real provider and a memory-backed route boundary. */
function renderLogin(entry = ROUTES.LOGIN) {
  return render(
    <PersonaProvider>
      <MemoryRouter initialEntries={[entry]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path={ROUTES.LOGIN} element={<LoginPage />} />
          <Route path="*" element={<Destination />} />
        </Routes>
      </MemoryRouter>
    </PersonaProvider>
  );
}

/** Verify the real persisted session rather than a mocked login invocation. */
function expectSession(personaId) {
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.SELECTED_PERSONA))).toBe(personaId);
  expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN))).toEqual({
    token: `eqip-mock-${personaId}`,
    at: expect.any(Number),
  });
}

beforeEach(() => localStorage.clear());
afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Login copyright and authentication regressions', () => {
  it('renders exactly one semantic noninteractive footer below the demo hint', async () => {
    const user = userEvent.setup();
    renderLogin();
    const footer = screen.getByRole('contentinfo');
    expect(screen.getAllByRole('contentinfo')).toHaveLength(1);
    expect(screen.getAllByText(NOTICE, { exact: true })).toHaveLength(1);
    expect(footer.tagName).toBe('FOOTER');
    expect(footer.textContent.trim()).toBe(NOTICE);
    expect(footer).toHaveAttribute('class', 'mt-6 text-xs text-slate-600');
    expect(footer.previousElementSibling).toHaveTextContent('Demo environment — no backend.');
    expect(footer.matches(FOCUSABLES)).toBe(false);
    expect(footer.querySelectorAll(FOCUSABLES)).toHaveLength(0);
    expect(footer).not.toHaveAttribute('aria-hidden');
    await user.tab();
    expect(screen.getByRole('combobox', { name: 'Persona' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('textbox', { name: 'Email (derived from persona)' })).toHaveFocus();
    await user.tab();
    expect(screen.getByLabelText('Password')).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: /^Sign in as / })).toHaveFocus();
    for (const name of ['Sarah Chen Executive Leadership', 'Robert Kim QE Manager', 'Lisa Johnson Quality Engineer', 'James Wright Automation Engineer']) {
      await user.tab();
      expect(screen.getByRole('button', { name, exact: true })).toHaveFocus();
    }
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('keeps the exact year range through a rerender under a different runtime date', () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
    const tree = (
      <PersonaProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LoginPage />
        </MemoryRouter>
      </PersonaProvider>
    );
    const view = render(tree);
    const originalFooter = screen.getByRole('contentinfo');
    expect(originalFooter.textContent.trim()).toBe(NOTICE);
    vi.setSystemTime(new Date('2042-12-31T23:59:59Z'));
    view.rerender(
      <PersonaProvider>
        <MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <LoginPage />
        </MemoryRouter>
      </PersonaProvider>
    );
    expect(screen.getByRole('contentinfo')).toBe(originalFooter);
    expect(new Date().getFullYear()).toBe(2042);
    expect(screen.getAllByText(NOTICE, { exact: true })).toHaveLength(1);
    expect(screen.getByRole('contentinfo').textContent.trim()).toBe(NOTICE);
  });

  it('updates the read-only email when a different seeded persona is selected', async () => {
    const user = userEvent.setup();
    renderLogin();
    const email = screen.getByRole('textbox', { name: 'Email (derived from persona)' });
    await user.selectOptions(screen.getByRole('combobox', { name: 'Persona' }), 'segment_leader');
    expect(email).toHaveValue('michael.torres@humana.com');
    expect(email).toHaveAttribute('readonly');
    expect(screen.getByRole('button', { name: 'Sign in as Michael Torres' })).toBeEnabled();
    expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
    expect(screen.getByRole('contentinfo').textContent.trim()).toBe(NOTICE);
  });

  it('submits the form with any demo password and persists the selected persona at its landing route', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Persona' }), 'segment_leader');
    await user.type(screen.getByLabelText('Password'), 'demo-password{Enter}');
    expect(await screen.findByRole('heading', { name: 'Destination: /dashboard' })).toBeVisible();
    expect(screen.getByText('Authenticated: Michael Torres')).toBeVisible();
    expectSession('segment_leader');
    expect(screen.queryByText(NOTICE)).not.toBeInTheDocument();
  });

  it('quick-signs in as the clicked persona without a password and persists its real session', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: 'Sarah Chen Executive Leadership', exact: true }));
    expect(await screen.findByRole('heading', { name: 'Destination: /dashboard' })).toBeVisible();
    expect(screen.getByText('Authenticated: Sarah Chen')).toBeVisible();
    expectSession('executive_leadership');
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('returns to the prior protected pathname instead of the persona landing page', async () => {
    const user = userEvent.setup();
    renderLogin({ pathname: ROUTES.LOGIN, state: { from: { pathname: ROUTES.PROFILE } } });
    await user.selectOptions(screen.getByRole('combobox'), 'executive_leadership');
    await user.click(screen.getByRole('button', { name: 'Sign in as Sarah Chen' }));
    expect(await screen.findByRole('heading', { name: 'Destination: /profile' })).toBeVisible();
    expect(screen.getByText('Authenticated: Sarah Chen')).toBeVisible();
    expectSession('executive_leadership');
  });

  it.each([undefined, ROUTES.PROFILE])('redirects an already authenticated session (prior route: %s)', async (prior) => {
    localStorage.setItem(STORAGE_KEYS.SELECTED_PERSONA, JSON.stringify('segment_leader'));
    localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify({ token: 'eqip-mock-segment_leader', at: 1 }));
    renderLogin({ pathname: ROUTES.LOGIN, state: prior ? { from: { pathname: prior } } : undefined });
    expect(await screen.findByRole('heading', { name: `Destination: ${prior || getPersonaById('segment_leader').landingPage}` })).toBeVisible();
    expect(screen.getByText('Authenticated: Michael Torres')).toBeVisible();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expectSession('segment_leader');
  });

  it('shows missing-persona validation without signing in or navigating and clears it on selection', async () => {
    const user = userEvent.setup();
    // The real provider always supplies seeded personas; override only this unreachable empty-data boundary.
    const login = vi.fn(() => { throw new Error('Empty persona submission must not call login'); });
    const value = { allPersonas: [], currentPersona: null, isAuthenticated: false, login };
    const view = render(
      <MemoryRouter initialEntries={[ROUTES.LOGIN]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PersonaContext.Provider value={value}>
          <LoginPage />
        </PersonaContext.Provider>
      </MemoryRouter>
    );
    await user.click(screen.getByRole('button', { name: 'Sign in', exact: true }));
    expect(screen.getByRole('alert')).toHaveTextContent('Please select a persona to continue.');
    expect(screen.getByRole('combobox').value).toBe('');
    expect(screen.queryAllByRole('option')).toHaveLength(0);
    expect(screen.getByRole('contentinfo').textContent.trim()).toBe(NOTICE);
    expect(localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)).toBeNull();
    expect(login).not.toHaveBeenCalled();
    view.rerender(
      <MemoryRouter initialEntries={[ROUTES.LOGIN]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <PersonaContext.Provider value={{ ...value, allPersonas: [getPersonaById('executive_leadership')] }}>
          <LoginPage />
        </PersonaContext.Provider>
      </MemoryRouter>
    );
    await user.selectOptions(screen.getByRole('combobox'), 'executive_leadership');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox')).toHaveValue('sarah.chen@humana.com');
  });
});
