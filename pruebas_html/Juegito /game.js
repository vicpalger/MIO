'use strict';
const canvas = document.querySelector('#game'), ctx = canvas.getContext('2d');
const overlay = document.querySelector('#overlay');
const ui = Object.fromEntries(['health', 'wave', 'kills', 'time', 'xpbar', 'level', 'pause'].map(id => [id, document.getElementById(id)]));
let W = 1000, H = 600, state = 'menu', player, enemies = [], bullets = [], gems = [], pickups = [], particles = [], keys = new Set(), mouse = { x: 500, y: 300, down: false };
let elapsed = 0, kills = 0, wave = 1, spawnClock = 0, fireClock = 0, last = 0, shake = 0, choices = [];
const rand = (a, b) => a + Math.random() * (b - a), distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
let best = 0; try { best = Number(localStorage.getItem('chispa-best')) || 0; } catch { }
function resize() { const r = canvas.getBoundingClientRect(); if (!r.width || !r.height) return; W = r.width; H = r.height; const d = .5; canvas.width = Math.round(W * d); canvas.height = Math.round(H * d); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.imageSmoothingEnabled = false; if (terrainReady) { buildTerrain(); if (player) freeTerrainPosition(player); for (const e of enemies) freeTerrainPosition(e); } if (player) { player.x = Math.min(W - 18, player.x); player.y = Math.min(H - 18, player.y); } }
new ResizeObserver(resize).observe(canvas);
function panel(title, body, button, action) { overlay.classList.remove('hidden'); overlay.innerHTML = `<div class="panel"><span class="eyebrow">ÚLTIMA CHISPA</span><h2>${title}</h2><p>${body}</p><button class="primary">${button}</button></div>`; overlay.querySelector('button').onclick = action; }
function start() { pendingUpgrade = false; pendingArtifact = false; completedPhases = 0; showGame(); runCoins = 0; rewardPaid = false; keys.clear(); player = { x: W / 2, y: H / 2, r: 12, hp: 100, max: 100, speed: 210, damage: 1, rate: .24, shots: 1, xp: 0, need: 6, level: 1, inv: 0, artifacts: [], pickupRadius: 100, range: 1, crit: 0, armor: 0 }; applyProgress(); buildTerrain(true); freeTerrainPosition(player); enemies = []; bullets = []; gems = []; pickups = []; particles = []; elapsed = 0; kills = 0; wave = 1; spawnClock = .6; fireClock = 0; mouse.down = false; shake = 0; state = 'playing'; overlay.classList.add('hidden'); ui.pause.textContent = 'Pausar'; canvas.focus(); updateHUD(); }
function updateHUD() { document.getElementById('health-fill').style.width = `${player.hp / player.max * 100}%`; document.getElementById('health-text').textContent = `${Math.ceil(player.hp)} / ${player.max} PV`; ui.health.setAttribute('aria-valuemin', '0'); ui.health.setAttribute('aria-valuemax', player.max); ui.health.setAttribute('aria-valuenow', player.hp); ui.wave.textContent = `OLEADA ${wave}`; ui.kills.textContent = `${kills} BAJAS`; ui.time.textContent = `${Math.floor(elapsed / 60)}:${String(Math.floor(elapsed % 60)).padStart(2, '0')} / 15:00`; document.getElementById('run-coins').textContent = `◈ ${runCoins}`; ui.level.textContent = `NIVEL ${player.level} · FASE ${Math.min(3, completedPhases + 1)} / 3${player.artifacts.length ? ' · ' + player.artifacts.map(id => artifacts.find(a => a.id === id).icon).join(' ') : ''}`; ui.xpbar.style.width = `${player.xp / player.need * 100}%`; }
const upgrades = [
    { name: 'Núcleo ardiente', icon: '✦', desc: '+1 de daño por proyectil.', apply: () => player.damage++ },
    { name: 'Gatillo veloz', icon: 'ϟ', desc: 'Dispara un 20 % más rápido.', apply: () => player.rate = Math.max(.065, player.rate * .8) },
    { name: 'Paso ligero', icon: '➚', desc: '+15 % de velocidad de movimiento.', apply: () => player.speed *= 1.15 },
    { name: 'Corazón de musgo', icon: '♥', desc: '+20 PV máximos y recupera toda la vida.', apply: () => { player.max += 20; player.hp = player.max; } },
    { name: 'Abanico de fuego', icon: '⋔', desc: 'Un proyectil adicional por disparo.', apply: () => player.shots++ },
    { name: 'Segundo aliento', icon: '✚', desc: 'Recupera 60 PV y gana un 10 % de velocidad.', apply: () => { player.hp = Math.min(player.max, player.hp + 60); player.speed *= 1.1; } },
    { name: 'Imán', icon: '∩', desc: '+60 píxeles de radio para atraer experiencia. Se acumula al elegirla de nuevo.', apply: () => player.pickupRadius += 60 },
    { name: 'Largo alcance', icon: '◎', desc: '+25 % de alcance: los proyectiles duran más tiempo.', apply: () => player.range *= 1.25 },
    { name: 'Golpe crítico', icon: '✧', desc: '+10 puntos de probabilidad de causar el doble de daño. Máximo: 60 %.', available: () => player.crit < .6, apply: () => player.crit = Math.min(.6, Math.round((player.crit + .1) * 10) / 10) },
    { name: 'Corteza protectora', icon: '▣', desc: 'Recibe 3 PV menos por contacto. El daño mínimo es de 5 PV.', available: () => player.armor < 15, apply: () => player.armor = Math.min(15, player.armor + 3) }

];
function levelUp() { player.xp -= player.need; player.level++; player.need = Math.ceil(player.need * 1.45); choices = upgrades.filter(u => !u.available || u.available()).sort(() => Math.random() - .5).slice(0, 3); pendingUpgrade = true; renderUpgrade(); }
function upgradePreview(upgrade) {
    const speed = value => `${Math.round(value)} px/s`;
    const rate = value => `${(1 / value).toFixed(1)} /s`;
    const stats = {
        'Núcleo ardiente': ['Daño', player.damage, player.damage + 1],
        'Gatillo veloz': ['Disparos', rate(player.rate), rate(Math.max(.065, player.rate * .8))],
        'Paso ligero': ['Velocidad', speed(player.speed), speed(player.speed * 1.15)],
        'Corazón de musgo': ['Vida máxima', `${player.max} PV`, `${player.max + 20} PV`],
        'Abanico de fuego': ['Proyectiles', player.shots, player.shots + 1],
        'Imán': ['Radio de recogida', `${player.pickupRadius} px`, `${player.pickupRadius + 60} px`],
        'Largo alcance': ['Alcance', `${Math.round(530 * (player.artifacts.includes('bounce') ? 4 : 1.5) * player.range)} px`, `${Math.round(530 * (player.artifacts.includes('bounce') ? 4 : 1.5) * player.range * 1.25)} px`],
        'Golpe crítico': ['Probabilidad', `${Math.round(player.crit * 100)} %`, `${Math.min(60, Math.round(player.crit * 100) + 10)} %`],
        'Corteza protectora': ['Daño recibido', `${20 - player.armor} PV`, `${Math.max(5, 20 - player.armor - 3)} PV`],
        'Segundo aliento': ['Vida', `${Math.ceil(player.hp)} PV`, `${Math.ceil(Math.min(player.max, player.hp + 60))} PV`]
    };
    const [label, before, after] = stats[upgrade.name];
    return `<span class="upgrade-stat"><span class="stat-label">${label}</span><span class="stat-change"><span>${before}</span><span class="stat-arrow" aria-hidden="true">→</span><strong>${after}</strong></span></span>`;
}
function renderUpgrade() { state = 'upgrade'; mouse.down = false; overlay.classList.remove('hidden'); overlay.innerHTML = `<div class="panel upgrade-panel"><h2>Subida de nivel <span class="level-number">${player.level}</span></h2><div class="cards">${choices.map((u, i) => `<button class="card" data-choice="${i}"><span class="upgrade-icon" aria-hidden="true">${upgradeIcon(u)}</span><b>${u.name}</b><small>${u.desc}</small>${upgradePreview(u)}<span class="pick-upgrade">Elegir mejora</span></button>`).join('')}</div></div>`; overlay.querySelectorAll('[data-choice]').forEach(b => b.onclick = () => { choices[Number(b.dataset.choice)].apply(); pendingUpgrade = false; state = 'playing'; overlay.classList.add('hidden'); canvas.focus(); updateHUD(); }); }
function pause() { if (state === 'playing') { state = 'paused'; mouse.down = false; keys.clear(); ui.pause.textContent = 'Continuar'; panel('Respira un momento.', 'Tu aventura te espera.', 'Continuar', pause); } else if (state === 'paused') { if (pendingArtifact) { renderArtifacts(); return; } if (pendingUpgrade) { renderUpgrade(); return; } state = 'playing'; ui.pause.textContent = 'Pausar'; overlay.classList.add('hidden'); canvas.focus(); } }
ui.pause.onclick = pause;
window.addEventListener('keydown', e => { if ((state === 'playing' || state === 'paused') && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault(); if (!e.repeat && e.code === 'KeyP') pause(); keys.add(e.code); });
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', () => { keys.clear(); mouse.down = false; if (state === 'playing') pause(); });
canvas.addEventListener('pointermove', e => { const r = canvas.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
canvas.addEventListener('pointerdown', e => { if (e.button === 0) { mouse.down = true; canvas.focus(); } }); window.addEventListener('pointerup', () => mouse.down = false);
function burst(x, y, color, n = 8) { for (let i = 0; i < n && particles.length < 180; i++)particles.push({ x, y, vx: rand(-90, 90), vy: rand(-90, 90), life: rand(.15, .45), color }); }
function spawn() { const side = Math.floor(rand(0, 4)), strong = Math.random() < Math.min(.35, wave * .045); enemies.push({ x: side === 0 ? -20 : side === 1 ? W + 20 : rand(0, W), y: side === 2 ? -20 : side === 3 ? H + 20 : rand(0, H), strong, r: strong ? 17 : 11, hp: strong ? 3 + Math.floor(wave / 3) : 1 + Math.floor(wave / 4), speed: (strong ? 43 : 65) + wave * 5, color: strong ? '#bf88d6' : '#de866d' }); }
const pickupTypes = {
    heal: { icon: '+', color: '#90efb0' },
    bomb: { icon: '✹', color: '#ffae76' },
    magnet: { icon: '∩', color: '#88caff' }
};
function defeatEnemy(enemy, allowPickup = true) {
    // All deaths share XP, coins and kill credit, including bomb kills.
    enemy.hp = 0; kills++;
    if (Math.random() < .25) {
        const amount = activeHero().id === 'sol' ? 4 : 2;
        runCoins += amount; progress.coins += amount; saveProgress();
    }
    if (gems.length < 220) gems.push({ x: enemy.x, y: enemy.y, value: 1 });
    if (allowPickup && pickups.length < 40) {
        const roll = Math.random(), factor = enemy.strong ? 2 : 1;
        const type = roll < .03 * factor ? 'heal' : roll < .04 * factor ? 'bomb' : roll < .06 * factor ? 'magnet' : null;
        if (type) pickups.push({ x: Math.max(16, Math.min(W - 16, enemy.x)), y: Math.max(16, Math.min(H - 16, enemy.y)), type, life: 30 });
    }
    burst(enemy.x, enemy.y, enemy.color);
}
function collectPickup(item) {
    burst(item.x, item.y, pickupTypes[item.type].color, 16);
    if (item.type === 'heal') player.hp = Math.min(player.max, player.hp + player.max * .1);
    if (item.type === 'magnet') { for (const gem of gems) gem.magnetized = true; }
    if (item.type === 'bomb') {
        for (const enemy of enemies) {
            if (enemy.hp > 0 && enemy.x >= 0 && enemy.x <= W && enemy.y >= 0 && enemy.y <= H) defeatEnemy(enemy, false);
        }
        enemies = enemies.filter(enemy => enemy.hp > 0); shake = 12;
    }
}
function aimAngle() { return Math.atan2(mouse.y - player.y, mouse.x - player.x); }
function shoot() { const angle = aimAngle(); if (!clearTerrainLine(player.x, player.y, player.x + Math.cos(angle) * 26, player.y + Math.sin(angle) * 26, 4)) return; for (let i = 0; i < player.shots && bullets.length < 220; i++) { let a = angle + (i - (player.shots - 1) / 2) * .16; bullets.push({ x: player.x + Math.cos(a) * 26, y: player.y + Math.sin(a) * 26, vx: Math.cos(a) * 530, vy: Math.sin(a) * 530, life: (player.artifacts.includes('bounce') ? 4 : 1.5) * player.range, damage: player.damage * (Math.random() < player.crit ? 2 : 1), hit: new Set(), bounces: 3 }); } }
function finishRun(manual = false) {
    if (rewardPaid) return 0;
    rewardPaid = true;
    const reward = 10 + Math.floor(elapsed / 5) + Math.floor(kills / 2);
    const loss = manual ? Math.ceil((runCoins + reward) / 2) : 0;
    progress.coins += reward - loss; progress.best = Math.max(progress.best, kills); best = progress.best;
    saveProgress(); return reward;
}
function die() {
    state = 'dead'; mouse.down = false; keys.clear();
    const reward = finishRun();
    panel('Hasta la última chispa.', `Sobreviviste ${Math.floor(elapsed)} segundos · Oleada ${wave}<br>${kills} bajas · Nivel ${player.level} · Récord: ${best} bajas<br>◈ ${runCoins} monedas de enemigos + ${reward} al terminar`, 'Volver a intentarlo', start);
    const home = document.createElement('button'); home.textContent = 'Volver al menú'; home.onclick = () => showMenu('jugar'); overlay.querySelector('.panel').appendChild(home);
}
function update(dt) {
    elapsed = Math.min(900, elapsed + dt);
    if (elapsed >= (completedPhases + 1) * 300) { updateHUD(); phaseComplete(); return; }
    wave = 1 + Math.floor(elapsed / 22); spawnClock -= dt; if (spawnClock <= 0) { if (enemies.length < 100) spawn(); spawnClock = Math.max(.17, .95 - wave * .075); } player.inv = Math.max(0, player.inv - dt); let dx = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft')), dy = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp')); let len = Math.hypot(dx, dy) || 1; moveOnTerrain(player, dx / len * player.speed * dt, dy / len * player.speed * dt); player.x = Math.max(15, Math.min(W - 15, player.x)); player.y = Math.max(15, Math.min(H - 15, player.y)); refreshFlow(dt); fireClock -= dt; if (mouse.down && fireClock <= 0) { shoot(); fireClock = player.rate; }
    for (const b of bullets) {
        if (player.artifacts.includes('homing')) {
            const targets = enemies.filter(e => e.hp > 0 && !b.hit.has(e));
            if (targets.length) { const target = targets.reduce((a, c) => distance(a, b) < distance(c, b) ? a : c); const angle = Math.atan2(target.y - b.y, target.x - b.x); b.vx = Math.cos(angle) * 530; b.vy = Math.sin(angle) * 530; }
        }
        const nextX = b.x + b.vx * dt, nextY = b.y + b.vy * dt;
        if (!clearTerrainLine(b.x, b.y, nextX, nextY, 4)) { b.life = 0; burst(b.x, b.y, '#9caa7b', 3); continue; }
        b.x = nextX; b.y = nextY; b.life -= dt;
        if (player.artifacts.includes('bounce') && b.bounces > 0) {
            if (b.x < 4 || b.x > W - 4) { b.vx *= -1; b.x = Math.max(4, Math.min(W - 4, b.x)); b.bounces--; }
            if ((b.y < 4 || b.y > H - 4) && b.bounces > 0) { b.vy *= -1; b.y = Math.max(4, Math.min(H - 4, b.y)); b.bounces--; }
        }
        for (const e of enemies) {
            if (e.hp > 0 && b.life > 0 && !b.hit.has(e) && distance(b, e) < e.r + 4) {
                e.hp -= b.damage; b.hit.add(e);
                if (!player.artifacts.includes('piercing')) b.life = 0;
                if (player.artifacts.includes('frost')) e.slow = 2;
                burst(b.x, b.y, '#e1f7a3', 4); if (e.hp <= 0) defeatEnemy(e);
            }
        }
    }
    bullets = bullets.filter(b => b.life > 0 && b.x > -30 && b.x < W + 30 && b.y > -30 && b.y < H + 30); enemies = enemies.filter(e => e.hp > 0);
    for (const e of enemies) { const d = distance(e, player) || 1; e.slow = Math.max(0, (e.slow || 0) - dt); const speed = e.speed * (e.slow > 0 ? .5 : 1); const target = terrainEnemyTarget(e), td = distance(target, e) || 1; moveOnTerrain(e, (target.x - e.x) / td * speed * dt, (target.y - e.y) / td * speed * dt); if (d < e.r + player.r && player.inv <= 0) { player.hp = Math.max(0, player.hp - Math.max(5, 20 - player.armor)); player.inv = 1.1; shake = 8; burst(player.x, player.y, '#d6f59a', 16); if (player.hp <= 0) { updateHUD(); die(); return; } } }
    for (const item of [...pickups]) {
        item.life -= dt;
        if (distance(item, player) < player.r + 13) { item.life = 0; collectPickup(item); }
    }
    pickups = pickups.filter(item => item.life > 0);
    for (const g of gems) {
        const d = distance(g, player);
        if (g.magnetized || d < player.pickupRadius) {
            const step = Math.min(d, (g.magnetized ? 600 : Math.max(300, player.pickupRadius * 3)) * dt);
            if (d > 0) { g.x += (player.x - g.x) / d * step; g.y += (player.y - g.y) / d * step; }
        }
        if (distance(g, player) < 19) { player.xp += g.value; g.value = 0; }
    } gems = gems.filter(g => g.value); for (const p of particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; } particles = particles.filter(p => p.life > 0); shake = Math.max(0, shake - dt * 35); if (player.xp >= player.need) levelUp(); updateHUD();
}
function circle(x, y, r, color) { ctx.fillStyle = color; ctx.fillRect(Math.round(x - r), Math.round(y - r), r * 2, r * 2); }
function draw() {
    ctx.clearRect(0, 0, W, H); ctx.save(); if (shake) ctx.translate(Math.round(rand(-shake, shake) / 2) * 2, Math.round(rand(-shake, shake) / 2) * 2); ctx.imageSmoothingEnabled = false;
    if (groundLayer) ctx.drawImage(groundLayer, 0, 0, W, H);
    for (const g of gems) {
        const bob = Math.floor(elapsed * 3) % 2 * 2;
        ctx.fillStyle='#071c2c';ctx.fillRect(Math.round(g.x-8),Math.round(g.y+7),16,4);
        drawSprite(ctx,'gem',g.x,g.y-bob,3);
        if(Math.floor(elapsed*2)%2===0){ctx.fillStyle='#c7faff';ctx.fillRect(Math.round(g.x+10),Math.round(g.y-bob-8),2,2);}
    }
    for (const b of bullets) { circle(b.x, b.y, 3, '#e8f9b0'); circle(b.x, b.y, 1, '#fff9da'); }
    const actors = enemies.map(e => ({ actor: e, hero: false })); if (player) actors.push({ actor: player, hero: true }); actors.sort((a, b) => a.actor.y - b.actor.y);
    for (const { actor: a, hero } of actors) {
        if (hero && a.inv > 0 && Math.floor(a.inv * 15) % 2) continue;
        ctx.fillStyle = '#0d201a'; ctx.fillRect(Math.round(a.x - 12), Math.round(a.y + 9), 24, 6);
        const walking = hero && (keys.has('KeyW') || keys.has('KeyA') || keys.has('KeyS') || keys.has('KeyD') || [...keys].some(k => k.startsWith('Arrow')));
        const bob = walking || !hero ? Math.floor(elapsed * 7) % 2 * 2 : 0;
        drawSprite(ctx, hero ? 'hero' : 'enemy', a.x, a.y - bob, hero ? 2 : a.strong ? 3 : 2, hero ? activeHero().color : a.slow > 0 ? '#8bc6e8' : a.color);
        if (hero) drawPixelGun(ctx, a.x, a.y, aimAngle());
    }
    for (const item of pickups) { ctx.globalAlpha = item.life < 5 ? .5 + .5 * Math.sin(elapsed * 12) : 1; drawSprite(ctx, item.type, item.x, item.y, 2); }
    ctx.globalAlpha = 1; for (const p of particles) { ctx.globalAlpha = Math.min(1, p.life * 3); circle(p.x, p.y, 2, p.color); } ctx.globalAlpha = 1; ctx.restore();
}
function frame(now) { const dt = Math.min(.04, (now - last) / 1000 || 0); last = now; if (state === 'playing') update(dt); if (state !== 'menu') draw(); requestAnimationFrame(frame); }
const heroes = [
    { id: 'brizna', name: 'Brizna', rarity: 'Común', color: '#c6e99b', icon: '✦', chance: 60, trait: 'Piel de bosque: empieza con 20 PV adicionales.' },
    { id: 'rafaga', name: 'Ráfaga', rarity: 'Raro', color: '#77bdff', icon: 'ϟ', chance: 25, trait: 'Viento a favor: se mueve un 30 % más rápido.' },
    { id: 'ascua', name: 'Ascua', rarity: 'Épico', color: '#bf88ef', icon: '❖', chance: 10, trait: 'Doble llama: empieza con dos proyectiles por disparo.' },
    { id: 'sol', name: 'Sol', rarity: 'Legendario', color: '#f3c56c', icon: '☀', chance: 4, trait: 'Toque dorado: duplica las monedas que sueltan los enemigos.' },
    { id: 'nova', name: 'Nova', rarity: 'Ultralegendario', color: '#fa8cbd', icon: '✺', chance: 1, trait: 'Núcleo estelar: sus proyectiles infligen el triple de daño base.' }
];
const permanent = [
    { id: 'health', name: 'Vitalidad', icon: '♥', desc: '+20 PV iniciales por nivel.', base: 50, max: 5 },
    { id: 'damage', name: 'Potencia', icon: '✦', desc: '+1 de daño inicial por nivel.', base: 80, max: 5 },
    { id: 'speed', name: 'Agilidad', icon: '➚', desc: '+10 % de velocidad inicial por nivel.', base: 40, max: 5 },
    { id: 'rate', name: 'Cadencia', icon: 'ϟ', desc: 'Reduce un 8 % el intervalo entre disparos por nivel.', base: 60, max: 5 }
];
const GACHA_COST = 50;
let progress = { coins: 0, owned: ['brizna'], selected: 'brizna', upgrades: { health: 0, damage: 0, speed: 0, rate: 0 }, best: best };
try {
    const data = JSON.parse(localStorage.getItem('chispa-progress'));
    if (data && typeof data === 'object') {
        progress.coins = Number.isSafeInteger(data.coins) && data.coins >= 0 ? data.coins : 0;
        progress.owned = heroes.filter(h => h.id === 'brizna' || (Array.isArray(data.owned) && data.owned.includes(h.id))).map(h => h.id);
        progress.selected = progress.owned.includes(data.selected) ? data.selected : 'brizna';
        permanent.forEach(u => { const n = data.upgrades && data.upgrades[u.id]; progress.upgrades[u.id] = Number.isInteger(n) ? Math.max(0, Math.min(u.max, n)) : 0; });
        progress.best = Number.isSafeInteger(data.best) && data.best >= 0 ? Math.max(best, data.best) : best;
    }
} catch { }
best = progress.best;
let runCoins = 0, rewardPaid = true, pendingUpgrade = false, currentTab = 'jugar';
const initialLobby = document.getElementById('lobby'), menuDialog = document.getElementById('menu-dialog');
let lobby = initialLobby;
const playArea = document.getElementById('play-area'), navigation = document.getElementById('navigation');
function activeHero() { return heroes.find(h => h.id === progress.selected) || heroes[0]; }
function saveProgress() { try { localStorage.setItem('chispa-progress', JSON.stringify(progress)); } catch { document.getElementById('save-status').textContent = 'No se ha podido guardar: el progreso durará hasta cerrar esta página.'; } document.getElementById('wallet').textContent = `◈ ${progress.coins} monedas`; }
function applyProgress() { const u = progress.upgrades, h = activeHero(); player.max += 20 * (u.health + (h.id === 'brizna' ? 1 : 0)); player.hp = player.max; player.damage = (1 + u.damage) * (h.id === 'nova' ? 3 : 1); player.speed *= (1 + u.speed * .1) * (h.id === 'rafaga' ? 1.3 : 1); player.rate *= Math.pow(.92, u.rate); player.shots = h.id === 'ascua' ? 2 : 1; }
function showGame() { menuDialog.close(); initialLobby.hidden = true; document.body.classList.remove('in-menu'); lobby.hidden = true; navigation.hidden = true; playArea.hidden = false; resize(); }
function heroSummary(hero){
    const u=progress.upgrades;
    const hp=100+20*(u.health+(hero.id==='brizna'?1:0));
    const damage=(1+u.damage)*(hero.id==='nova'?3:1);
    const speed=Math.round(210*(1+u.speed*.1)*(hero.id==='rafaga'?1.3:1));
    return `<div class="hero-summary"><span>Vida <strong>${hp} PV</strong></span><span>Daño <strong>${damage}</strong></span><span>Velocidad <strong>${speed} px/s</strong></span></div>`;
}
function permanentPreview(upgrade){
    const n=progress.upgrades[upgrade.id],next=Math.min(upgrade.max,n+1);
    const format=level=>upgrade.id==='health'?`+${level*20} PV`:upgrade.id==='damage'?`+${level} daño`:upgrade.id==='speed'?`+${level*10} %`:`${(1/(.24*Math.pow(.92,level))).toFixed(1)} /s`;
    return `<div class="upgrade-stat"><span class="stat-label">${n===upgrade.max?'Mejora completa':'Actual → siguiente nivel'}</span><span class="stat-change"><span>${format(n)}</span>${n===upgrade.max?'':`<span class="stat-arrow" aria-hidden="true">→</span><strong>${format(next)}</strong>`}</span></div><div class="permanent-level" aria-label="Nivel ${n} de ${upgrade.max}">${Array.from({length:upgrade.max},(_,i)=>`<span class="${i<n?'filled':''}"></span>`).join('')}</div><span class="permanent-level-label">Nivel ${n} / ${upgrade.max}</span>`;
}
function heroCard(h, inventory = false) { const owned = progress.owned.includes(h.id), selected = progress.selected === h.id; return `<article class="hero-card ${!owned ? 'locked' : ''}" style="--rarity:${h.color}"><span class="rarity">${h.rarity}</span>${heroPortrait(h)}<h2>${h.name}</h2><p>${h.trait}</p>${inventory ? `<button data-equip="${h.id}" ${!owned || selected ? 'disabled' : ''}>${selected ? 'Equipado' : owned ? 'Equipar' : 'Sin conseguir'}</button>` : `<small>${h.chance} % de probabilidad · ${owned ? 'En tu inventario' : 'Por descubrir'}</small>`}</article>`; }
function equipHero(id) { if (state !== 'menu' || !progress.owned.includes(id)) return; progress.selected = id; saveProgress(); showMenu(currentTab); }
function upgradeCost(u) { return u.base * (progress.upgrades[u.id] + 1); }
function buyUpgrade(id) { if (state !== 'menu') return false; const u = permanent.find(x => x.id === id); if (!u) return false; const cost = upgradeCost(u); if (progress.upgrades[id] >= u.max || progress.coins < cost) return false; progress.coins -= cost; progress.upgrades[id]++; saveProgress(); showMenu('mejoras'); return true; }
function summon() { if (state !== 'menu' || progress.coins < GACHA_COST) return null; progress.coins -= GACHA_COST; let roll = Math.random() * 100; let hero = heroes[heroes.length - 1]; for (const h of heroes) { roll -= h.chance; if (roll < 0) { hero = h; break; } } const duplicate = progress.owned.includes(hero.id); if (duplicate) progress.coins += 20; else progress.owned.push(hero.id); saveProgress(); showMenu('gacha'); const result = document.getElementById('gacha-result'); result.innerHTML = `<div class="hero-card result" style="--rarity:${hero.color}"><span class="rarity">${hero.rarity}</span>${heroPortrait(hero)}<h2>${hero.name}</h2><p>${hero.trait}</p><strong>${duplicate ? 'Repetido: recuperas 20 monedas.' : '¡Nuevo personaje! Ya está en tu inventario.'}</strong></div>`; result.focus(); return hero; }
function showMenu(tab = 'jugar') {
    const isPanel = tab !== 'jugar';
    lobby = isPanel ? document.getElementById('menu-content') : initialLobby;
    if (!isPanel) menuDialog.close();
    initialLobby.hidden = false;
    state = 'menu'; currentTab = tab; mouse.down = false; keys.clear(); document.body.classList.add('in-menu'); lobby.hidden = false; navigation.hidden = false; playArea.hidden = true; overlay.classList.add('hidden');
    navigation.innerHTML = '<div class="menu-brand"><div class="brand">✦ ÚLTIMA CHISPA</div><span class="tag">ROGUELIKE · ARENA</span></div>' + ['jugar', 'mejoras', 'inventario', 'gacha', 'personaje'].map(id => `<button data-tab="${id}" class="${id === tab ? 'active' : ''}" aria-current="${id === tab ? 'page' : 'false'}">${id === 'jugar' ? '<span class="play-icon" aria-hidden="true">▶</span> Jugar' : id[0].toUpperCase() + id.slice(1)}</button>`).join('');
    navigation.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => b.dataset.tab === 'jugar' ? start() : showMenu(b.dataset.tab));
    const h = activeHero();
    if (tab === 'jugar') lobby.innerHTML = `<p class="eyebrow">EL REFUGIO · RÉCORD ${best} BAJAS</p><h1>Inicio</h1><p>Equipa a tu héroe, refuerza sus habilidades y sal a defender la chispa.</p><div class="collection"><article class="hero-card" style="--rarity:${h.color}"><span class="rarity">${h.rarity} · PERSONAJE EQUIPADO</span>${heroPortrait(h,true)}<h2>${h.name}</h2><p>${h.trait}</p>${heroSummary(h)}<button data-go="personaje">Ver personaje</button></article><article class="hero-card guide-card"><span class="upgrade-icon" aria-hidden="true">${upgradeIcon({icon:'✦'})}</span><h2>Cómo jugar</h2><p>Los enemigos tienen un 25 % de probabilidad de darte 2 monedas. Sol obtiene 4.</p><p>Al terminar recibes 10 monedas, más 1 por cada 5 segundos y 1 por cada 2 bajas.</p><p>Recoge los objetos al pasar sobre ellos: + cura un 10 % de vida máxima, ✹ elimina los enemigos en pantalla y ∩ recoge toda la experiencia.</p><p>Sobrevive 15 minutos: cada 5 minutos eliges un artefacto. Abandonar reduce a la mitad las monedas de esa partida.</p><p>Las mejoras del refugio son permanentes. Las elegidas al subir de nivel duran una partida.</p></article></div>`;
    if (tab === 'inventario') lobby.innerHTML = `<p class="eyebrow">TU COLECCIÓN · ${progress.owned.length} / ${heroes.length}</p><h1>Inventario</h1><p>Estos son los personajes que tienes. Equipa uno para tu próxima partida.</p><div class="collection">${heroes.filter(h => progress.owned.includes(h.id)).map(h => heroCard(h, true)).join('')}</div>`;
    if (tab === 'personaje') { const u = progress.upgrades; const hp = 100 + 20 * (u.health + (h.id === 'brizna' ? 1 : 0)), damage = (1 + u.damage) * (h.id === 'nova' ? 3 : 1), speed = Math.round(210 * (1 + u.speed * .1) * (h.id === 'rafaga' ? 1.3 : 1)); lobby.innerHTML = `<p class="eyebrow">PREPARADO PARA LA ARENA</p><h1>Personaje</h1><article class="hero-card" style="--rarity:${h.color}"><span class="rarity">${h.rarity}</span>${heroPortrait(h,true)}<h2>${h.name}</h2><p>${h.trait}</p><p>♥ ${hp} PV · ✦ ${damage} de daño · ➚ ${speed} de velocidad · ${h.id === 'ascua' ? 2 : 1} proyectil(es)</p><p>Cadencia: ${(1 / (.24 * Math.pow(.92, u.rate))).toFixed(1)} disparos por segundo.</p><button data-go="inventario">Cambiar personaje</button></article>`; }
    if (tab === 'mejoras') lobby.innerHTML = `<p class="eyebrow">EL TALLER DEL REFUGIO</p><h1>Mejoras permanentes</h1><p>Se aplican a todos tus personajes al empezar una partida. Cada mejora tiene cinco niveles.</p><div class="collection">${permanent.map(u => { const n = progress.upgrades[u.id], cost = upgradeCost(u); return `<article class="hero-card permanent-card"><span class="upgrade-icon" aria-hidden="true">${upgradeIcon(u)}</span><h2>${u.name}</h2><p>${u.desc}</p>${permanentPreview(u)}<button data-buy="${u.id}" ${n >= u.max || progress.coins < cost ? 'disabled' : ''}>${n >= u.max ? 'Al máximo' : `Mejorar · ◈ ${cost}`}</button></article>`; }).join('')}</div>`;
    if (tab === 'gacha') lobby.innerHTML = `<p class="eyebrow">EL PORTAL DE LAS CHISPAS</p><h1>Gacha</h1><p>Invoca un personaje por ${GACHA_COST} monedas del juego. Si se repite, recuperas 20 monedas.</p><button id="summon" class="primary" ${progress.coins < GACHA_COST ? 'disabled' : ''}>Invocar · ◈ ${GACHA_COST}</button>${progress.coins < GACHA_COST ? `<p>Te faltan ${GACHA_COST - progress.coins} monedas. Consíguelas jugando.</p>` : ''}<div id="gacha-result" aria-live="polite" tabindex="-1"></div><div class="collection">${heroes.map(h => heroCard(h)).join('')}</div>`;
    if (isPanel) { menuDialog.setAttribute('aria-label', tab[0].toUpperCase() + tab.slice(1)); if (!menuDialog.open) menuDialog.showModal(); }
    const summonButton = document.getElementById('summon'); if (summonButton) summonButton.onclick = summon;
    lobby.querySelectorAll('[data-equip]').forEach(b => b.onclick = () => equipHero(b.dataset.equip));
    lobby.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => buyUpgrade(b.dataset.buy));
    lobby.querySelectorAll('[data-go]').forEach(b => b.onclick = () => showMenu(b.dataset.go));
    document.getElementById('wallet').textContent = `◈ ${progress.coins} monedas`;
}
document.getElementById('close-panel').onclick = () => showMenu('jugar');
menuDialog.addEventListener('cancel', e => { e.preventDefault(); showMenu('jugar'); });
document.getElementById('home').onclick = () => {
    if (['playing', 'paused', 'upgrade', 'artifact'].includes(state)) {
        state = 'paused'; keys.clear(); mouse.down = false;
        panel('¿Terminar esta partida?', 'Si abandonas, perderás el 50 % de las monedas conseguidas en esta partida, incluida la recompensa final. Las monedas anteriores se conservan.', 'Terminar y volver al menú', () => { finishRun(true); showMenu('jugar'); });
        const resume = document.createElement('button'); resume.textContent = 'Seguir jugando'; resume.onclick = () => { if (pendingArtifact) { renderArtifacts(); } else if (pendingUpgrade) { renderUpgrade(); } else { state = 'playing'; overlay.classList.add('hidden'); ui.pause.textContent = 'Pausar'; canvas.focus(); } }; overlay.querySelector('.panel').appendChild(resume);
    } else showMenu('jugar');
};

const artifacts = [
    { id: 'homing', name: 'Ojo del cometa', icon: '◎', desc: 'Los proyectiles persiguen al enemigo más cercano después de disparar.' },
    { id: 'piercing', name: 'Aguja del vacío', icon: '➶', desc: 'Los proyectiles atraviesan enemigos y pueden golpear a varios objetivos.' },
    { id: 'frost', name: 'Cristal invernal', icon: '❄', desc: 'Cada impacto ralentiza al enemigo un 50 % durante 2 segundos.' },
    { id: 'bounce', name: 'Espejo solar', icon: '◇', desc: 'Los proyectiles rebotan hasta tres veces en los bordes y duran más.' }
];
let completedPhases = 0, pendingArtifact = false, artifactChoices = [];
function phaseComplete() {
    completedPhases++; pendingArtifact = true; mouse.down = false; keys.clear();
    artifactChoices = artifacts.filter(a => !player.artifacts.includes(a.id)).sort(() => Math.random() - .5).slice(0, 3);
    renderArtifacts();
}
function renderArtifacts() {
    state = 'artifact'; overlay.classList.remove('hidden');
    overlay.innerHTML = `<div class="panel"><span class="eyebrow">FASE ${completedPhases} / 3 COMPLETADA</span><h2>Un poder ancestral.</h2><p>Elige un artefacto. Sus efectos se combinan y duran esta partida.${completedPhases === 3 ? ' Esta es tu recompensa final antes de completar la aventura.' : ''}</p><div class="cards">${artifactChoices.map((a, i) => `<button class="card" data-artifact="${i}"><em>${a.icon}</em><b>${a.name}</b><small>${a.desc}</small></button>`).join('')}</div></div>`;
    overlay.querySelectorAll('[data-artifact]').forEach(b => b.onclick = () => {
        player.artifacts.push(artifactChoices[Number(b.dataset.artifact)].id); pendingArtifact = false;
        if (completedPhases === 3) { victory(); return; }
        state = 'playing'; overlay.classList.add('hidden'); ui.pause.textContent = 'Pausar'; canvas.focus(); updateHUD();
    });
}
function victory() {
    state = 'won'; mouse.down = false; keys.clear(); const reward = finishRun();
    panel('La noche ha terminado.', `¡Has sobrevivido los 15 minutos!<br>${kills} bajas · ◈ ${runCoins} de enemigos + ${reward} de recompensa<br>Artefactos: ${player.artifacts.map(id => artifacts.find(a => a.id === id).name).join(', ')}`, 'Volver al refugio', () => showMenu('jugar'));
}

showMenu('jugar'); requestAnimationFrame(frame);
