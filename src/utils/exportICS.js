const STATUS_LABELS = {
  preparing: 'Připravuje se',
  in_progress: 'Běží',
  completed: 'Dokončeno',
  paused: 'Pozastaveno',
};

function toICSDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

function addOneDay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function escapeICS(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\\\')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')
    .replace(/\n/g, '\\n');
}

function dtstamp() {
  return new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Generuje ICS obsah pro seznam projektů.
 * @param {Array} projects - pole projektů
 * @param {Array} [assignments] - volitelně přiřazení (pro zobrazení montážníků v popisu)
 * @param {Array} [workers] - volitelně pracovníci
 * @returns {string} - ICS obsah
 */
function buildICS(projects, assignments = [], workers = []) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Project Manager//CS',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Projekty',
    'X-WR-TIMEZONE:Europe/Prague',
  ];

  const stamp = dtstamp();

  for (const project of projects) {
    if (!project.start_date || !project.end_date) continue;

    const dtStart = toICSDate(project.start_date);
    const dtEnd = toICSDate(addOneDay(project.end_date)); // ICS: DTEND je exkluzivní

    const projectWorkers = assignments
      .filter(a => a.project_id === project.id && a.worker_id)
      .map(a => {
        const w = workers.find(w => w.id === a.worker_id);
        return w ? `${w.first_name} ${w.last_name}` : null;
      })
      .filter(Boolean);

    const descParts = [
      `Lokalita: ${project.location || '—'}`,
      `Status: ${STATUS_LABELS[project.status] || project.status}`,
      project.budget ? `Rozpočet: ${Number(project.budget).toLocaleString('cs-CZ')} ${project.budget_currency || 'CZK'}` : null,
      projectWorkers.length > 0 ? `Montážníci: ${projectWorkers.join(', ')}` : null,
    ].filter(Boolean).join('\\n');

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:project-${project.id}@pm`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
    lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
    lines.push(`SUMMARY:${escapeICS(project.name)}`);
    if (project.location) lines.push(`LOCATION:${escapeICS(project.location)}`);
    lines.push(`DESCRIPTION:${descParts}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Stáhne ICS soubor s projekty.
 */
export function downloadProjectsICS(projects, assignments = [], workers = [], filename = 'projekty.ics') {
  const content = buildICS(projects, assignments, workers);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
