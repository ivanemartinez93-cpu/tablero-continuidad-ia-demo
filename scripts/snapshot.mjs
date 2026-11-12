// Export only approved demo task fields. Never print the API response or token.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

export function sanitize(payload, now = new Date()) {
const statuses = {'to do':'Pendiente', 'in progress':'En curso', 'complete':'Completada', 'closed':'Completada', 'blocked':'Bloqueada'};
const priorities = new Set(['urgent','high','normal','low']);
if (!Array.isArray(payload.tasks) || payload.last_page !== true) throw new Error('Respuesta incompleta o paginada');
const selected = new Map();
for (const task of payload.tasks) {
  const match = /^T(0[1-9]|1[0-2])\s*[·-]/i.exec(task.name || '');
  if (!match) continue;
  const id = `T${match[1]}`;
  if (selected.has(id)) throw new Error(`ID duplicado: ${id}`);
  const status = statuses[String(task.status?.status || '').toLowerCase()];
  if (!status) throw new Error(`Estado no admitido en ${id}`);
  let due = null;
  if (task.due_date != null) {
    const ms = Number(task.due_date);
    if (!Number.isFinite(ms) || !Number.isFinite(new Date(ms).getTime())) throw new Error(`Fecha inválida en ${id}`);
    due = new Date(ms).toISOString();
  }
  const priority = String(task.priority?.priority || '').toLowerCase();
  if (priority && !priorities.has(priority)) throw new Error(`Prioridad no admitida en ${id}`);
  selected.set(id, {id, estado: status, fecha: due, prioridad: priority || null});
}
if (selected.size !== 12) throw new Error(`Se esperaban 12 tareas; recibidas ${selected.size}`);
return {fuente:'ClickUp lista de demostración', actualizado: now.toISOString(), tasks:[...selected.values()].sort((a,b)=>a.id.localeCompare(b.id))};
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
const token = process.env.CLICKUP_TOKEN;
if (!token) throw new Error('Falta el secreto CLICKUP_TOKEN');
const response = await fetch('https://api.clickup.com/api/v2/list/1600320000025526/task?include_closed=true', {
  headers: { Authorization: token }, signal: AbortSignal.timeout(30000)
});
if (!response.ok) throw new Error(`ClickUp respondió HTTP ${response.status}`);
const output = sanitize(await response.json());
await writeFile('datos-demo.json', JSON.stringify(output, null, 2)+'\n');
console.log('Instantánea limitada generada para 12 tareas de demostración.');
}

