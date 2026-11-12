import { useState } from 'react';
import { api, saveSession } from '../../api.js';
import { errorText } from '../../utils.js';

export default function StaffLogin({ notice, onLogin }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const result = await api.login(data.get('username'), data.get('password'));
      const session = { token: result.token, expiresAt: result.expiresAt, username: result.username };
      saveSession(session);
      onLogin(session);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  return (
    <section className="staff staff-login" id="staff">
      <h1 className="heading">staff <span>sign in</span></h1>
      <form className="staff-form" onSubmit={submit}>
        {notice && <p className="staff-note">{notice}</p>}
        <input
          className="staff-input"
          type="text"
          name="username"
          placeholder="Username"
          autoComplete="username"
          required
        />
        <input
          className="staff-input"
          type="password"
          name="password"
          placeholder="Password"
          autoComplete="current-password"
          required
        />
        {error && (
          <p className="staff-error" role="alert">
            {error}
          </p>
        )}
        <input type="submit" className="btn" value={busy ? 'signing in...' : 'sign in'} disabled={busy} />
      </form>
    </section>
  );
}
