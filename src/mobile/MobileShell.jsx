import App from './App.jsx';

export default function MobileShell({ user, onLogout }) {
  return <App user={user} onLogout={onLogout} />;
}
