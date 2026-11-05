const TARGETS = {
  west: { name: 'West', x: 594, y: 604, size: 2 },
  south: { name: 'South', x: 594, y: 594, size: 2 },
  east: { name: 'East', x: 604, y: 594, size: 2 },
  north: { name: 'North', x: 604, y: 604, size: 2 },
  castle: { name: 'Castle', x: 597, y: 597, size: 6 }
};
const BUFFER_SECONDS = 15;
// Applied only when a specified arrival time is used; intentionally not shown in March time.
const HIDDEN_MARCH_SECONDS = 5 * 60;
const DEFAULT_SPEED_PERCENT = 25;
const DEFAULT_PET_DURATION_HOURS = 2;
const DEFAULT_PET_BONUS_PERCENT = 30;
const STORAGE_KEY = 'rally-timings-v2';
const $ = (selector) => document.querySelector(selector);
const players = $('#players');
const template = $('#player-template');

function utcTimeValue(date = new Date()) { return date.toISOString().slice(11, 19); }
function petDurationMs(row) { return Math.max(0, Number(row.querySelector('.pet-duration').value) || 0) * 60 * 60 * 1000; }
function petBonus(row) { return Math.max(0, Number(row.querySelector('.pet-bonus').value) || 0); }

function addPlayer(data = {}) {
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector('.player-name').value = data.name || '';
  row.querySelector('.player-x').value = data.x ?? '';
  row.querySelector('.player-y').value = data.y ?? '';
  row.querySelector('.player-target').value = data.target || 'west';
  row.querySelector('.player-enabled').checked = data.enabled !== false;
  row.querySelector('.pet-duration').value = data.petDuration ?? DEFAULT_PET_DURATION_HOURS;
  row.querySelector('.pet-bonus').value = data.petBonus ?? DEFAULT_PET_BONUS_PERCENT;
  row.querySelector('.pet-countdown').value = data.petsUntil ? formatCountdown(Number(data.petsUntil) - Date.now()) : formatCountdown(petDurationMs(row));
  row.dataset.petsUntil = data.petsUntil || '';
  row.querySelector('.remove').addEventListener('click', () => { row.remove(); save(); });
  row.querySelector('.player-enabled').addEventListener('change', () => { updateEnabledRow(row); save(); });
  row.querySelector('.player-target').addEventListener('change', () => { applyPlayerFilter(); save(); });
  row.querySelector('.player-pets').addEventListener('change', (event) => {
    row.dataset.petsUntil = event.target.checked ? String(Date.now() + petDurationMs(row)) : '';
    updatePetRow(row); save();
  });
  row.querySelector('.pet-countdown').addEventListener('change', (event) => {
    const seconds = parseCountdown(event.target.value);
    if (seconds === null) { updatePetRow(row); return; }
    row.dataset.petsUntil = seconds ? String(Date.now() + seconds * 1000) : '';
    updatePetRow(row); save();
  });
  row.querySelectorAll('input, select').forEach((input) => input.addEventListener('input', save));
  players.append(row);
  updatePetRow(row);
  updateEnabledRow(row);
  enableDrag(row);
}

function getPlayers() {
  const now = Date.now();
  return [...players.rows].map((row) => {
    const petsUntil = Number(row.dataset.petsUntil) || 0;
    const petsActive = petsUntil > now;
    return {
      name: row.querySelector('.player-name').value.trim() || 'Unnamed player',
      x: Number(row.querySelector('.player-x').value),
      y: Number(row.querySelector('.player-y').value),
      target: row.querySelector('.player-target').value,
      enabled: row.querySelector('.player-enabled').checked,
      petsUntil: petsActive ? petsUntil : 0,
      petsActive,
      speed: DEFAULT_SPEED_PERCENT + (petsActive ? petBonus(row) : 0)
    };
  }).filter((player) => player.enabled && Number.isFinite(player.x) && Number.isFinite(player.y));
}

function playersForStorage() {
  return [...players.rows].map((row) => ({
    name: row.querySelector('.player-name').value,
    x: row.querySelector('.player-x').value,
    y: row.querySelector('.player-y').value,
    target: row.querySelector('.player-target').value,
    enabled: row.querySelector('.player-enabled').checked,
    petDuration: row.querySelector('.pet-duration').value,
    petBonus: row.querySelector('.pet-bonus').value,
    petsUntil: Number(row.dataset.petsUntil) || 0
  }));
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getAppState()));
}

function getAppState() {
  return {
    arrival: $('#arrival-time').value,
    mode: $('input[name="calculation-mode"]:checked').value,
    players: playersForStorage()
  };
}

function formatUtc(date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date) + ' UTC';
}

function arrivalFromTime(value) {
  const [hours, minutes, seconds = 0] = value.split(':').map(Number);
  const now = new Date();
  const arrival = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, seconds));
  if (arrival.getTime() <= now.getTime()) arrival.setUTCDate(arrival.getUTCDate() + 1);
  return arrival;
}

function formatCountdown(milliseconds) {
  const total = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function parseCountdown(value) {
  const match = /^(\d{1,3}):([0-5]\d):([0-5]\d)$/.exec(value.trim());
  return match ? Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3]) : null;
}

function updatePetRow(row) {
  const until = Number(row.dataset.petsUntil) || 0;
  const active = until > Date.now();
  const checkbox = row.querySelector('.player-pets');
  const countdown = row.querySelector('.pet-countdown');
  checkbox.checked = active;
  row.querySelector('.pet-status').textContent = active ? formatCountdown(until - Date.now()) : 'Off';
  if (document.activeElement !== countdown) countdown.value = active ? formatCountdown(until - Date.now()) : '00:00:00';
  row.classList.toggle('pets-active', active);
  if (!active) row.dataset.petsUntil = '';
}

function updateEnabledRow(row) {
  row.classList.toggle('is-disabled', !row.querySelector('.player-enabled').checked);
}

function enableDrag(row) {
  row.addEventListener('dragstart', () => row.classList.add('dragging'));
  row.addEventListener('dragend', () => { row.classList.remove('dragging'); save(); });
}

function updateLiveDisplays() {
  $('#utc-clock').textContent = formatUtc(new Date()).replace(' UTC', '');
  [...players.rows].forEach(updatePetRow);
}

function march(player) {
  const target = TARGETS[player.target];
  const sourceX = player.x + 1, sourceY = player.y + 1;
  const targetOffset = target.size / 2;
  const distance = Math.hypot((target.x + targetOffset) - sourceX, (target.y + targetOffset) - sourceY);
  const seconds = Math.ceil(5 + (distance * 1300 / (1300 + distance)) * 60 / (11 * (1 + player.speed / 100)));
  return { target, seconds };
}

function updateCalculationMode() {
  $('#arrival-time').disabled = $('input[name="calculation-mode"]:checked').value === 'buffer';
}

function calculate() {
  const mode = $('input[name="calculation-mode"]:checked').value;
  const arrivalText = $('#arrival-time').value;
  let arrival = arrivalText ? arrivalFromTime(arrivalText) : null;
  const output = getPlayers().map((player) => ({ ...player, ...march(player) }));
  if (mode === 'arrival' && (!arrivalText || Number.isNaN(arrival?.getTime()))) return alert('Enter a valid arrival time in UTC.');
  if (!output.length) return alert('Add at least one player with coordinates.');
  for (const player of output) player.schedulingSeconds = player.seconds + (mode === 'arrival' ? HIDDEN_MARCH_SECONDS : 0);
  const arrivals = new Map();
  if (mode === 'buffer') {
    const firstDeparture = new Date(Date.now() + BUFFER_SECONDS * 1000);
    const groups = new Map();
    for (const player of output) {
      const group = groups.get(player.target.name) || [];
      group.push(player);
      groups.set(player.target.name, group);
    }
    for (const [target, group] of groups) {
      arrivals.set(target, new Date(firstDeparture.getTime() + Math.max(...group.map((player) => player.schedulingSeconds)) * 1000));
    }
    $('#result-lead').textContent = `Each target is timed independently. The longest march to each target starts at ${formatUtc(firstDeparture)} (now + ${BUFFER_SECONDS}s).`;
  } else {
    for (const player of output) arrivals.set(player.target.name, arrival);
    $('#result-lead').textContent = `Each target group uses the selected arrival time: ${formatUtc(arrival)}.`;
  }
  const resultRows = output.map((player) => {
    const start = new Date(arrivals.get(player.target.name).getTime() - player.schedulingSeconds * 1000);
    const petLabel = player.petsActive ? ' · Pets active' : '';
    return { start, html: `<tr><td>${escapeHtml(player.name)}<small class="result-note">${petLabel}</small></td><td>${player.target.name}</td><td>${player.seconds} sec</td><td class="start-time">${formatUtc(start)}</td></tr>` };
  }).sort((a, b) => a.start - b.start);
  $('#results-body').innerHTML = resultRows.map((result) => result.html).join('');
  $('.results').hidden = false;
  save();
}

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function copyResults() { navigator.clipboard.writeText([...$('#results-body').rows].map((row) => [...row.cells].map((cell) => cell.innerText.replace(/\n/g, ' ')).join(' | ')).join('\n')).then(() => { $('#copy-results').textContent = 'Copied'; setTimeout(() => $('#copy-results').textContent = 'Copy', 1400); }); }

function applyPlayerFilter() {
  const query = $('#player-search').value.trim().toLowerCase();
  const target = $('#target-filter').value;
  [...players.rows].forEach((row) => {
    const name = row.querySelector('.player-name').value.toLowerCase();
    const rowTarget = row.querySelector('.player-target').value;
    row.hidden = Boolean((query && !name.includes(query)) || (target !== 'all' && rowTarget !== target));
  });
}

function sortPlayersByTarget() {
  const order = ['west', 'south', 'east', 'north', 'castle'];
  [...players.rows].sort((a, b) => order.indexOf(a.querySelector('.player-target').value) - order.indexOf(b.querySelector('.player-target').value)).forEach((row) => players.append(row));
  save();
}

function replaceNames() {
  const find = $('#find-name').value;
  if (!find) return;
  const replacement = $('#replace-name').value;
  const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(escaped, 'gi');
  [...players.rows].forEach((row) => {
    const input = row.querySelector('.player-name');
    input.value = input.value.replace(expression, replacement);
  });
  applyPlayerFilter(); save();
}

function exportData() {
  const blob = new Blob([JSON.stringify(getAppState(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'rally-timings.json'; link.click();
  URL.revokeObjectURL(url);
}

async function importData(file) {
  try {
    const state = JSON.parse(await file.text());
    if (!Array.isArray(state.players)) throw new Error('invalid');
    players.replaceChildren();
    $('#arrival-time').value = state.arrival?.slice(-8) || utcTimeValue();
    document.querySelector(`input[name="calculation-mode"][value="${state.mode || 'arrival'}"]`).checked = true;
    state.players.forEach((player) => addPlayer(player));
    updateCalculationMode(); applyPlayerFilter(); save();
  } catch { alert('This is not a valid Rally Timings export file.'); }
}

$('#add-player').addEventListener('click', () => addPlayer());
$('#calculate').addEventListener('click', calculate);
$('#copy-results').addEventListener('click', copyResults);
$('#arrival-time').addEventListener('input', save);
$('#player-search').addEventListener('input', applyPlayerFilter);
$('#target-filter').addEventListener('change', applyPlayerFilter);
$('#sort-targets').addEventListener('click', sortPlayersByTarget);
$('#replace-all').addEventListener('click', replaceNames);
$('#export-data').addEventListener('click', exportData);
$('#import-data').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', (event) => { if (event.target.files[0]) importData(event.target.files[0]); event.target.value = ''; });
document.querySelectorAll('input[name="calculation-mode"]').forEach((input) => input.addEventListener('change', () => { updateCalculationMode(); save(); }));
$('#clear-all').addEventListener('click', () => { if (confirm('Remove all players?')) { players.replaceChildren(); localStorage.removeItem(STORAGE_KEY); $('.results').hidden = true; } });

const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem('rally-timings-v1') || 'null');
$('#arrival-time').value = saved?.arrival?.slice(-8) || utcTimeValue();
document.querySelector(`input[name="calculation-mode"][value="${saved?.mode || 'arrival'}"]`).checked = true;
(saved?.players?.length ? saved.players : [{ name: '', x: 610, y: 620, target: 'west' }]).forEach((player) => addPlayer({ ...player, target: player.target || saved?.target || 'west' }));
players.addEventListener('dragover', (event) => {
  event.preventDefault();
  const dragging = players.querySelector('.dragging');
  if (!dragging) return;
  const after = [...players.querySelectorAll('tr:not(.dragging)')].find((row) => event.clientY < row.getBoundingClientRect().top + row.getBoundingClientRect().height / 2);
  players.insertBefore(dragging, after || null);
});
updateCalculationMode();
updateLiveDisplays();
setInterval(updateLiveDisplays, 250);
