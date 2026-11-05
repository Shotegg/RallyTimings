const TARGETS = {
  west: { name: 'West', x: 594, y: 604, size: 2 },
  south: { name: 'South', x: 594, y: 594, size: 2 },
  east: { name: 'East', x: 604, y: 594, size: 2 },
  north: { name: 'North', x: 604, y: 604, size: 2 },
  castle: { name: 'Castle', x: 597, y: 597, size: 6 }
};
const STORAGE_KEY = 'rally-timings-v1';
const $ = (selector) => document.querySelector(selector);
const players = $('#players');
const template = $('#player-template');

function utcLocalValue(date = new Date()) {
  return date.toISOString().slice(0, 19);
}

function addPlayer(data = {}) {
  const row = template.content.firstElementChild.cloneNode(true);
  row.querySelector('.player-name').value = data.name || '';
  row.querySelector('.player-x').value = data.x ?? '';
  row.querySelector('.player-y').value = data.y ?? '';
  row.querySelector('.player-speed').value = data.speed ?? 25;
  row.querySelector('.remove').addEventListener('click', () => { row.remove(); save(); });
  row.querySelectorAll('input').forEach((input) => input.addEventListener('input', save));
  players.append(row);
}

function getPlayers() {
  return [...players.rows].map((row) => ({
    name: row.querySelector('.player-name').value.trim() || 'Χωρίς όνομα',
    x: Number(row.querySelector('.player-x').value),
    y: Number(row.querySelector('.player-y').value),
    speed: Number(row.querySelector('.player-speed').value)
  })).filter((player) => Number.isFinite(player.x) && Number.isFinite(player.y) && Number.isFinite(player.speed));
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ target: $('#target').value, arrival: $('#arrival-time').value, players: getPlayers() }));
}

function formatUtc(date) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(date).replace(',', '') + ' UTC';
}

function march(player, target) {
  // 2×2 player centre is x+1/y+1; targets use +1, castle uses +3.
  const sourceX = player.x + 1, sourceY = player.y + 1;
  const targetOffset = target.size / 2;
  const dx = (target.x + targetOffset) - sourceX;
  const dy = (target.y + targetOffset) - sourceY;
  const distance = Math.hypot(dx, dy);
  const seconds = Math.ceil(5 + (distance * 1300 / (1300 + distance)) * 60 / (11 * (1 + player.speed / 100)));
  return { distance, seconds };
}

function updateTargetHint() {
  const t = TARGETS[$('#target').value];
  $('#target-hint').textContent = `${t.name}: κάτω-αριστερή συντεταγμένη ${t.x}, ${t.y} · μέγεθος ${t.size}×${t.size}.`;
}

function calculate() {
  const arrivalText = $('#arrival-time').value;
  const arrival = new Date(`${arrivalText}Z`);
  const validPlayers = getPlayers();
  if (!arrivalText || Number.isNaN(arrival.getTime())) return alert('Βάλε έγκυρη ώρα άφιξης σε UTC.');
  if (!validPlayers.length) return alert('Πρόσθεσε τουλάχιστον ένα άτομο με συντεταγμένες και speed.');
  const target = TARGETS[$('#target').value];
  const output = validPlayers.map((player) => ({ ...player, ...march(player, target) }));
  $('#result-lead').textContent = `Όλοι πρέπει να φτάσουν στις ${formatUtc(arrival)} στον στόχο ${target.name}.`;
  $('#results-body').innerHTML = output.map((p) => {
    const start = new Date(arrival.getTime() - p.seconds * 1000);
    return `<tr><td>${escapeHtml(p.name)}</td><td class="route">${p.x}, ${p.y} → ${target.x}, ${target.y}<br>${p.distance.toFixed(2)} units</td><td>${p.seconds} sec</td><td class="start-time">${formatUtc(start)}</td></tr>`;
  }).join('');
  $('.results').hidden = false;
  save();
}

function escapeHtml(value) { const div = document.createElement('div'); div.textContent = value; return div.innerHTML; }
function copyResults() { navigator.clipboard.writeText([...$('#results-body').rows].map((row) => [...row.cells].map((cell) => cell.innerText.replace(/\n/g, ' ')).join(' | ')).join('\n')).then(() => { $('#copy-results').textContent = 'Αντιγράφηκε'; setTimeout(() => $('#copy-results').textContent = 'Αντιγραφή', 1400); }); }

$('#add-player').addEventListener('click', () => addPlayer());
$('#calculate').addEventListener('click', calculate);
$('#copy-results').addEventListener('click', copyResults);
$('#target').addEventListener('change', () => { updateTargetHint(); save(); });
$('#arrival-time').addEventListener('input', save);
$('#clear-all').addEventListener('click', () => { if (confirm('Να διαγραφούν όλα τα άτομα;')) { players.replaceChildren(); localStorage.removeItem(STORAGE_KEY); $('.results').hidden = true; } });

const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
$('#target').value = saved?.target || 'west';
$('#arrival-time').value = saved?.arrival || utcLocalValue();
(saved?.players?.length ? saved.players : [{ name: '', x: 610, y: 620, speed: 25 }]).forEach(addPlayer);
updateTargetHint();
