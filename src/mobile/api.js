const BASE = '/api';

export async function fetchTable(table) {
  const res = await fetch(`${BASE}/data/${table}`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`Error fetching ${table}: ${res.status}`);
  return res.json();
}

export async function writeData(action, data, sheetName, matchKeys, userId, userName) {
  const res = await fetch(`${BASE}/write`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data, sheetName, matchKeys, userId, userName })
  });
  if (!res.ok) throw new Error(`Error writing data: ${res.status}`);
  return res.json();
}

export async function login(nombre, password) {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, password })
  });
  if (!res.ok) throw new Error('Credenciales inválidas');
  return res.json();
}

export function formatMoney(val) {
  return Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
}

export function hhmmToDecimal(hhmm) {
  if (!hhmm || typeof hhmm !== 'string') return 0;
  const parts = hhmm.split(':');
  if (parts.length < 2) return parseFloat(hhmm) || 0;
  return parseFloat(parts[0]) + parseFloat(parts[1]) / 60;
}
