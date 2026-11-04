'use strict';
// Static scenery is painted once per arena size; navigation is shared by all enemies.
let terrainReady = false, obstacles = [], groundLayer, navigationGrid, flowClock = 0;
let terrainSeed=7241, terrainRound=0, terrainPlan=[], terrainStyle;
function terrainRandom(seed){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function terrainPathX(y){return .5+terrainStyle.bendX*(Math.sin((y-.5)*Math.PI*2+terrainStyle.phaseX)-Math.sin(terrainStyle.phaseX));}
function terrainPathY(x){return .5+terrainStyle.bendY*(Math.sin((x-.5)*Math.PI*2+terrainStyle.phaseY)-Math.sin(terrainStyle.phaseY));}
function newTerrainPlan(){
    terrainSeed=((Math.random()*4294967296)>>>0)^(++terrainRound*2654435761);
    const random=terrainRandom(terrainSeed);
    const palettes=[['#1b3225','#1e3627','#203929','#1a3024'],['#202f29','#24392f','#293d31','#1d3029'],['#293423','#303c27','#263622','#2b3925']];
    terrainStyle={bendX:.025+random()*.045,bendY:.025+random()*.045,phaseX:random()*6.28,phaseY:random()*6.28,grass:palettes[Math.floor(random()*palettes.length)]};
    terrainPlan=[];
    const count=Math.max(10,Math.min(26,Math.round(W*H/45000)));
    for(let attempt=0;attempt<500&&terrainPlan.length<count;attempt++){
        const nx=.08+random()*.84,ny=.12+random()*.76;
        const type=terrainPlan.length<2?'wall':random()<.55?'tree':random()<.7?'rock':'wall';
        const radius=type==='wall'?55:32;
        if(Math.hypot((nx-.5)*W,(ny-.5)*H)<110)continue;
        if(Math.abs(nx-terrainPathX(ny))*W<radius+34||Math.abs(ny-terrainPathY(nx))*H<radius+34)continue;
        if(terrainPlan.some(([x,y,t])=>Math.hypot((nx-x)*W,(ny-y)*H)<radius+(t==='wall'?55:32)+48))continue;
        terrainPlan.push([nx,ny,type]);
    }
}
function connectTerrain(){
    // Reject layouts that isolate any walkable navigation cell.
    while(obstacles.length){
        buildNavigation();const {cols,rows,blocked}=navigationGrid;
        const start=blocked.findIndex(v=>!v);if(start<0){obstacles.pop();continue;}
        const visited=new Uint8Array(blocked.length),queue=[start];visited[start]=1;
        for(let head=0;head<queue.length;head++){
            const i=queue[head],x=i%cols,y=Math.floor(i/cols);
            for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]])if(nx>=0&&ny>=0&&nx<cols&&ny<rows){const n=ny*cols+nx;if(!blocked[n]&&!visited[n]){visited[n]=1;queue.push(n);}}
        }
        if(blocked.every((v,i)=>v||visited[i]))break;
        obstacles.pop();
    }
}
function terrainHit(x, y, r = 0) {
    return obstacles.some(o => x + r > o.x && x - r < o.x + o.w && y + r > o.y && y - r < o.y + o.h);
}
function moveOnTerrain(actor, dx, dy) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 6));
    for (let i = 0; i < steps; i++) {
        if (!terrainHit(actor.x + dx / steps, actor.y, actor.r)) actor.x += dx / steps;
        if (!terrainHit(actor.x, actor.y + dy / steps, actor.r)) actor.y += dy / steps;
    }
}
function freeTerrainPosition(actor) {
    actor.x = Math.max(actor.r + 2, Math.min(W - actor.r - 2, actor.x));
    actor.y = Math.max(actor.r + 2, Math.min(H - actor.r - 2, actor.y));
    if (!terrainHit(actor.x, actor.y, actor.r)) return;
    const x = actor.x, y = actor.y;
    for (let radius = 12; radius < Math.max(W, H); radius += 12)for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const nx = x + Math.cos(a) * radius, ny = y + Math.sin(a) * radius;
        if (nx > actor.r && nx < W - actor.r && ny > actor.r && ny < H - actor.r && !terrainHit(nx, ny, actor.r)) { actor.x = nx; actor.y = ny; return; }
    }
    actor.x = W / 2; actor.y = H / 2;
}
function clearTerrainLine(x, y, tx, ty, r = 0) {
    const n = Math.max(1, Math.ceil(Math.hypot(tx - x, ty - y) / 6));
    for (let i = 0; i <= n; i++)if (terrainHit(x + (tx - x) * i / n, y + (ty - y) * i / n, r)) return false;
    return true;
}
function buildTerrain(newRound=false) {
    if(newRound||!terrainStyle)newTerrainPlan();
    terrainReady = true;
    const scale = Math.min(1, Math.max(.55, Math.min(W / 1000, H / 650)));
    obstacles = terrainPlan.map(([nx, ny, type]) => {
        const w = (type === 'wall' ? 90 : type === 'tree' ? 38 : 42) * scale, h = (type === 'wall' ? 25 : type === 'tree' ? 36 : 30) * scale;
        return { x: nx * W - w / 2, y: ny * H - h / 2, w, h, type };
    }).filter(o => Math.hypot(o.x + o.w / 2 - W / 2, o.y + o.h / 2 - H / 2) > 85);
    connectTerrain();
    groundLayer = document.createElement('canvas'); groundLayer.width = Math.ceil(W / 2); groundLayer.height = Math.ceil(H / 2);
    const g = groundLayer.getContext('2d'); g.scale(.5, .5); g.imageSmoothingEnabled = false;
    const noise=terrainRandom(terrainSeed);
    const tile = 16;
    for (let y = 0; y < H; y += tile)for (let x = 0; x < W; x += tile) {
        const pathX = W * terrainPathX(y/H), pathY = H * terrainPathY(x/W);
        const path = Math.abs(x - pathX) < 28 * scale || Math.abs(y - pathY) < 28 * scale;
        const colors = path ? ['#514b32', '#544e35', '#4b462f'] : terrainStyle.grass;
        g.fillStyle = colors[Math.floor(noise() * colors.length)]; g.fillRect(x, y, tile, tile);
        for (let i = 0; i < 2; i++) { const px = x + Math.floor(noise() * 7) * 2, py = y + Math.floor(noise() * 7) * 2; g.fillStyle = path ? '#706644' : ['#2e4c34', '#29442f', '#36523a'][i]; g.fillRect(px, py, 2, path ? 2 : 4); if (!path && i === 0) g.fillRect(px + 2, py + 2, 2, 4); }
        if (!path && noise() < .018) { g.fillStyle = '#b19b68'; g.fillRect(x + 6, y + 8, 4, 2); g.fillStyle = '#7c684a'; g.fillRect(x + 8, y + 10, 2, 2); }
    }
    for (let y = -1; y <= 1; y++)for (let x = -1; x <= 1; x++) {
        const px = Math.round(W / 2 + x * 26 - 12), py = Math.round(H / 2 + y * 26 - 12);
        g.fillStyle = '#172a22'; g.fillRect(px, py, 24, 24); g.fillStyle = '#566253'; g.fillRect(px + 2, py + 2, 20, 20); g.fillStyle = '#78816a'; g.fillRect(px + 2, py + 2, 20, 2); g.fillStyle = '#334738'; g.fillRect(px + 8, py + 16, 12, 4);
    }
    for (const o of obstacles) paintObstacle(g, o);
    buildNavigation(); flowClock = 0;
}
function paintObstacle(g, o) {
    const { x, y, w, h, type } = o;
    g.fillStyle = '#10251e'; g.fillRect(Math.round(x - 4), Math.round(y + h - 2), Math.round(w + 12), 10);
    if (type === 'tree') drawSprite(g, 'tree', x + w / 2, y + h / 2 - 5, Math.max(2, Math.round(w / 18)));
    else if (type === 'rock') drawSprite(g, 'rock', x + w / 2, y + h / 2, Math.max(2, Math.round(w / 14)));
    else {
        g.fillStyle = '#13291f'; g.fillRect(x, y, w, h);
        for (let row = 0; row < 2; row++)for (let bx = 0; bx < w; bx += 18) {
            const bw = Math.min(16, w - bx - 2); if (bw <= 0) continue;
            g.fillStyle = row ? '#536252' : '#74816a'; g.fillRect(x + bx + 2, y + row * 12 + 2, bw, 10);
            g.fillStyle = '#96a084'; g.fillRect(x + bx + 2, y + row * 12 + 2, bw, 2);
        }
        g.fillStyle = '#3c643b'; g.fillRect(x + 2, y + h - 4, w * .65, 4); g.fillRect(x + 8, y + h - 8, 8, 4);
    }
}
function buildNavigation() {
    const size = 24, cols = Math.ceil(W / size), rows = Math.ceil(H / size), blocked = new Uint8Array(cols * rows);
    for (let y = 0; y < rows; y++)for (let x = 0; x < cols; x++)blocked[y * cols + x] = terrainHit(Math.min(W - 1, x * size + size / 2), Math.min(H - 1, y * size + size / 2), 19) ? 1 : 0;
    navigationGrid = { size, cols, rows, blocked, dist: new Int32Array(cols * rows) };
}
function refreshFlow(dt) {
    flowClock -= dt; if (flowClock > 0) return; flowClock = .35;
    const { size, cols, rows, blocked, dist } = navigationGrid; dist.fill(-1);
    let target = Math.min(rows - 1, Math.floor(player.y / size)) * cols + Math.min(cols - 1, Math.floor(player.x / size));
    if (blocked[target]) { let best = Infinity; for (let i = 0; i < blocked.length; i++)if (!blocked[i]) { const d = Math.hypot((i % cols) * size + size / 2 - player.x, Math.floor(i / cols) * size + size / 2 - player.y); if (d < best) { best = d; target = i; } } }
    const queue = [target]; dist[target] = 0;
    for (let head = 0; head < queue.length; head++) {
        const i = queue[head], x = i % cols, y = Math.floor(i / cols);
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) if (nx >= 0 && ny >= 0 && nx < cols && ny < rows) { const n = ny * cols + nx; if (!blocked[n] && dist[n] < 0) { dist[n] = dist[i] + 1; queue.push(n); } }
    }
}
function terrainEnemyTarget(e) {
    if (clearTerrainLine(e.x, e.y, player.x, player.y, e.r + 1)) return player;
    const { size, cols, rows, dist, blocked } = navigationGrid, x = Math.max(0, Math.min(cols - 1, Math.floor(e.x / size))), y = Math.max(0, Math.min(rows - 1, Math.floor(e.y / size)));
    let best = Infinity, target = e;
    for (let dy = -1; dy <= 1; dy++)for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const i = ny * cols + nx, tx = nx * size + size / 2, ty = ny * size + size / 2;
        if (!blocked[i] && dist[i] >= 0 && dist[i] < best && clearTerrainLine(e.x, e.y, tx, ty, e.r + 1)) { best = dist[i]; target = { x: tx, y: ty }; }
    }
    return target;
}
