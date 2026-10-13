// ================== OVERWORLD MAP ==================
(function() {
  'use strict';
  const { TILE, T, findPath, drawTile, drawPlayerSprite, setupCanvas } = window.Engine;

  const canvas = document.getElementById('game');
  const VW = 320, VH = 180;
  const { ctx, screenToWorld } = setupCanvas(canvas, VW, VH);
  const getScale = () => {
    const rect = canvas.getBoundingClientRect();
    return rect.width / VW;
  };

  const MAP_W = 40, MAP_H = 30;

  // ---- Houses ----
  const houses = [
    { id: 'home', name: '🏠 Nhà Tôi', doorX: 5, doorY: 9, x: 4, y: 8, file: 'interiors/home.html' },
    { id: 'grandma', name: '🏡 Nhà Bà & Ông', doorX: 13, doorY: 7, x: 12, y: 6, file: 'interiors/grandma.html' },
    { id: 'school', name: '🏫 Hội Trường', doorX: 23, doorY: 9, x: 22, y: 8, file: 'interiors/school.html' }
  ];

  // ---- Build map ----
  const map = [];
  for (let y = 0; y < MAP_H; y++) {
    map[y] = [];
    for (let x = 0; x < MAP_W; x++) map[y][x] = T.GRASS;
  }

  // Water
  for (let y = 0; y < MAP_H; y++)
    for (let x = 17; x <= 19; x++) map[y][x] = T.WATER;

  // Bridge
  for (let x = 17; x <= 19; x++) {
    map[14][x] = T.BRIDGE;
    map[15][x] = T.BRIDGE;
  }

  // Paths
  for (let x = 0; x < MAP_W; x++)
    if (x < 17 || x > 19) map[15][x] = T.PATH;
  for (let y = 5; y < 25; y++) {
    map[y][8] = T.PATH;
    map[y][28] = T.PATH;
  }

  // Place entry houses
  function placeHouse(h) {
    map[h.y][h.x] = T.HOUSE;
    map[h.y][h.x+1] = T.HOUSE;
    map[h.y-1][h.x] = T.ROOF;
    map[h.y-1][h.x+1] = T.ROOF;
    map[h.doorY][h.doorX] = T.DOOR;
  }
  houses.forEach(placeHouse);

  // Decorative houses
  [[32,10],[6,20],[24,20],[34,20]].forEach(([x, y]) => {
    map[y][x] = T.HOUSE;
    map[y][x+1] = T.HOUSE;
    map[y-1][x] = T.ROOF;
    map[y-1][x+1] = T.ROOF;
  });

  // Trees
  [[2,2],[5,2],[14,2],[25,2],[30,2],[36,2],[2,5],[36,5],[2,10],[36,10],
   [2,25],[10,25],[20,25],[30,25],[36,25],[15,10],[22,5],[26,12],[5,12],
   [33,14],[11,18],[17,20],[27,18],[35,24],[3,15],[37,15],[13,24],[23,24]]
  .forEach(([x, y]) => { if (map[y][x] === T.GRASS) map[y][x] = T.TREE; });

  // Flowers
  [[3,4],[6,4],[10,4],[20,3],[25,4],[31,3],[4,14],[12,14],[24,14],[32,14],
   [7,22],[15,22],[25,22],[33,22],[9,6],[20,10],[28,6],[35,6]]
  .forEach(([x, y]) => { if (map[y][x] === T.GRASS) map[y][x] = T.FLOWER; });

  // Fences
  for (let x = 3; x <= 6; x++) if (map[10][x] === T.GRASS) map[10][x] = T.FENCE;
  for (let x = 21; x <= 24; x++) if (map[10][x] === T.GRASS) map[10][x] = T.FENCE;

  // Sand
  for (let y = 0; y < MAP_H; y++) {
    if (map[y][16] === T.GRASS) map[y][16] = T.SAND;
    if (map[y][20] === T.GRASS) map[y][20] = T.SAND;
  }

  // ---- Player state ----
  const urlParams = new URLSearchParams(window.location.search);
  const spawnX = parseFloat(urlParams.get('px'));
  const spawnY = parseFloat(urlParams.get('py'));

  const player = {
    x: !isNaN(spawnX) ? spawnX : 8 * TILE + TILE/2,
    y: !isNaN(spawnY) ? spawnY : 15 * TILE + TILE/2,
    speed: 60, size: 10, dir: 0,
    moving: false, animTime: 0
  };

  const camera = { x: 0, y: 0 };
  const keys = {};
  let currentPath = [];
  let pathIndex = 0;

  function isWalkable(tx, ty) {
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return false;
    const t = map[ty][tx];
    return t !== T.WATER && t !== T.TREE && t !== T.HOUSE &&
           t !== T.ROOF && t !== T.FENCE;
  }

  // ---- Input ----
  canvas.addEventListener('click', (e) => {
    const w = screenToWorld(e.clientX, e.clientY, camera.x, camera.y);
    const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
    const ptx = Math.floor(player.x / TILE), pty = Math.floor(player.y / TILE);
    const path = findPath(ptx, pty, tx, ty, isWalkable);
    if (path.length > 0) { currentPath = path; pathIndex = 1; }
    hideHint();
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.target === canvas) {
      e.preventDefault();
      const touch = e.touches[0];
      const w = screenToWorld(touch.clientX, touch.clientY, camera.x, camera.y);
      const tx = Math.floor(w.x / TILE), ty = Math.floor(w.y / TILE);
      const ptx = Math.floor(player.x / TILE), pty = Math.floor(player.y / TILE);
      const path = findPath(ptx, pty, tx, ty, isWalkable);
      if (path.length > 0) { currentPath = path; pathIndex = 1; }
      hideHint();
    }
  }, { passive: false });

  // Interaction button
  document.getElementById('interactBtn').addEventListener('click', doInteract);
  document.getElementById('interactBtn').addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation(); doInteract();
  }, { passive: false });

  function doInteract() {
    const btn = document.getElementById('interactBtn');
    const houseId = btn.dataset.houseId;
    if (houseId) {
      const house = houses.find(h => h.id === houseId);
      if (house) {
        // Pass spawn position for return
        sessionStorage.setItem('returnX', player.x);
        sessionStorage.setItem('returnY', player.y);
        window.location.href = house.file;
      }
    }
  }

  function checkInteraction() {
    const ptx = Math.floor(player.x / TILE);
    const pty = Math.floor(player.y / TILE);
    let nearestHouse = null, nearestDist = Infinity;

    for (const house of houses) {
      const dx = house.doorX - ptx, dy = house.doorY - pty;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 2.5 && dist < nearestDist) {
        nearestDist = dist;
        nearestHouse = house;
      }
    }

    const btn = document.getElementById('interactBtn');
    const label = document.getElementById('interactLabel');

    if (nearestHouse) {
      btn.classList.add('show');
      btn.textContent = 'E';
      label.textContent = '🚪 Vào ' + nearestHouse.name;
      label.classList.add('show');
      btn.dataset.houseId = nearestHouse.id;
    } else {
      btn.classList.remove('show');
      label.classList.remove('show');
      btn.dataset.houseId = '';
    }
  }

  // Joystick
  const joystick = document.getElementById('joystick');
  const knob = document.getElementById('joystickKnob');
  let joystickActive = false;
  let joystickVector = { x: 0, y: 0 };
  let joystickCenter = { x: 0, y: 0 };

  joystick.addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation();
    joystickActive = true;
    const r = joystick.getBoundingClientRect();
    joystickCenter = { x: r.left + r.width/2, y: r.top + r.height/2 };
    updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
    hideHint();
  }, { passive: false });

  document.addEventListener('touchmove', (e) => {
    if (!joystickActive) return;
    e.preventDefault();
    updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  document.addEventListener('touchend', () => {
    if (joystickActive) {
      joystickActive = false;
      joystickVector = { x: 0, y: 0 };
      knob.style.transform = 'translate(-50%, -50%)';
    }
  });

  function updateJoystick(cx, cy) {
    const dx = cx - joystickCenter.x;
    const dy = cy - joystickCenter.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const maxDist = 45;
    const clampedDist = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clampedDist;
    const ny = Math.sin(angle) * clampedDist;
    knob.style.transform = `translate(calc(-50% + ${nx}px), calc(-50% + ${ny}px))`;
    if (dist > 10) {
      joystickVector = { x: nx / maxDist, y: ny / maxDist };
      currentPath = [];
    } else {
      joystickVector = { x: 0, y: 0 };
    }
  }

  window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase()))
      e.preventDefault();
    if (e.key.toLowerCase() === 'e' || e.key === ' ') doInteract();
    hideHint();
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  let hintHidden = false;
  function hideHint() {
    if (hintHidden) return;
    hintHidden = true;
    const hint = document.getElementById('hint');
    hint.style.opacity = '0';
    setTimeout(() => hint.style.display = 'none', 500);
  }

  // ---- Update ----
  function update(dt) {
    let kx = 0, ky = 0;
    if (keys['arrowleft'] || keys['a']) kx -= 1;
    if (keys['arrowright'] || keys['d']) kx += 1;
    if (keys['arrowup'] || keys['w']) ky -= 1;
    if (keys['arrowdown'] || keys['s']) ky += 1;

    if (kx !== 0 || ky !== 0) {
      currentPath = [];
      const len = Math.sqrt(kx*kx + ky*ky);
      kx /= len; ky /= len;
      const nx = player.x + kx * player.speed * dt;
      const ny = player.y + ky * player.speed * dt;
      if (isWalkable(Math.floor(nx / TILE), Math.floor(player.y / TILE))) player.x = nx;
      if (isWalkable(Math.floor(player.x / TILE), Math.floor(ny / TILE))) player.y = ny;
      if (Math.abs(kx) > Math.abs(ky)) player.dir = kx > 0 ? 3 : 2;
      else if (ky !== 0) player.dir = ky > 0 ? 0 : 1;
      player.moving = true;
    } else if (joystickVector.x !== 0 || joystickVector.y !== 0) {
      currentPath = [];
      const nx = player.x + joystickVector.x * player.speed * dt;
      const ny = player.y + joystickVector.y * player.speed * dt;
      if (isWalkable(Math.floor(nx / TILE), Math.floor(player.y / TILE))) player.x = nx;
      if (isWalkable(Math.floor(player.x / TILE), Math.floor(ny / TILE))) player.y = ny;
      if (Math.abs(joystickVector.x) > Math.abs(joystickVector.y))
        player.dir = joystickVector.x > 0 ? 3 : 2;
      else if (joystickVector.y !== 0) player.dir = joystickVector.y > 0 ? 0 : 1;
      player.moving = true;
    } else if (currentPath.length > 0 && pathIndex < currentPath.length) {
      const [tx, ty] = currentPath[pathIndex];
      const targetX = tx * TILE + TILE/2;
      const targetY = ty * TILE + TILE/2;
      const dx = targetX - player.x;
      const dy = targetY - player.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < 2) {
        player.x = targetX; player.y = targetY; pathIndex++;
        if (pathIndex >= currentPath.length) { currentPath = []; player.moving = false; }
      } else {
        const nx = dx / dist, ny = dy / dist;
        player.x += nx * player.speed * dt;
        player.y += ny * player.speed * dt;
        player.moving = true;
        if (Math.abs(nx) > Math.abs(ny)) player.dir = nx > 0 ? 3 : 2;
        else player.dir = ny > 0 ? 0 : 1;
      }
    } else {
      player.moving = false;
    }

    if (player.moving) player.animTime += dt;
    else player.animTime = 0;

    const tcx = player.x - VW/2, tcy = player.y - VH/2;
    camera.x += (tcx - camera.x) * Math.min(1, dt * 8);
    camera.y += (tcy - camera.y) * Math.min(1, dt * 8);
    camera.x = Math.max(0, Math.min(MAP_W * TILE - VW, camera.x));
    camera.y = Math.max(0, Math.min(MAP_H * TILE - VH, camera.y));

    checkInteraction();
  }

  // ---- Render ----
  function render() {
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, VW, VH);

    const startX = Math.floor(camera.x / TILE);
    const startY = Math.floor(camera.y / TILE);
    const endX = Math.ceil((camera.x + VW) / TILE);
    const endY = Math.ceil((camera.y + VH) / TILE);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || x >= MAP_W || y < 0 || y >= MAP_H) continue;
        drawTile(ctx, map[y][x],
          Math.round(x * TILE - camera.x),
          Math.round(y * TILE - camera.y));
      }
    }

    if (currentPath.length > 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      for (let i = pathIndex; i < currentPath.length; i++) {
        const [tx, ty] = currentPath[i];
        ctx.fillRect(
          Math.round(tx * TILE - camera.x + TILE/2 - 2),
          Math.round(ty * TILE - camera.y + TILE/2 - 2),
          4, 4);
      }
    }

    drawPlayerSprite(ctx,
      Math.round(player.x - camera.x),
      Math.round(player.y - camera.y),
      player, player.size);

    // House labels
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    for (const house of houses) {
      const sx = (house.x + 1) * TILE - camera.x;
      const sy = (house.y - 2) * TILE - camera.y;
      if (sx > -50 && sx < VW + 50 && sy > -20 && sy < VH + 20) {
        const tw = ctx.measureText(house.name).width + 6;
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(sx - tw/2, sy - 8, tw, 11);
        ctx.fillStyle = '#ffd700';
        ctx.fillText(house.name, sx, sy);
      }
    }
    ctx.textAlign = 'left';

    const grad = ctx.createRadialGradient(VW/2, VH/2, VH/3, VW/2, VH/2, VH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);
  }

  // ---- Loop ----
  let lastTime = 0;
  function loop(t) {
    const dt = Math.min((t - lastTime) / 1000, 0.1);
    lastTime = t;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame((t) => { lastTime = t; loop(t); });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
})();
