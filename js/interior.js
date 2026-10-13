// ================== INTERIOR ENGINE ==================
(function() {
  'use strict';
  const { TILE, T, findPath, drawTile, drawPlayerSprite, drawNpc, setupCanvas } = window.Engine;

  const canvas = document.getElementById('game');
  const VW = 320, VH = 180;
  const { ctx, screenToWorld } = setupCanvas(canvas, VW, VH);

  // ---- HOUSE DATA (set by each interior page via window.HOUSE_DATA) ----
  const house = window.HOUSE_DATA;
  if (!house) {
    console.error('HOUSE_DATA missing!');
    return;
  }

  // ---- Build interior map ----
  const { w, h, furniture } = house.interior;
  const interiorMap = [];
  for (let y = 0; y < h; y++) {
    interiorMap[y] = [];
    for (let x = 0; x < w; x++) {
      if (x === 0 || x === w-1 || y === 0 || y === h-1) interiorMap[y][x] = T.WALL;
      else interiorMap[y][x] = T.WOOD_FLOOR;
    }
  }

  // Door at bottom center
  const doorX = Math.floor(w / 2);
  interiorMap[h-1][doorX] = T.DOOR_INSIDE;

  // Windows
  interiorMap[0][2] = T.WINDOW;
  interiorMap[0][w-3] = T.WINDOW;

  // Furniture
  if (furniture === 'home') {
    interiorMap[2][2] = T.BED;
    interiorMap[2][w-3] = T.BED;
    interiorMap[4][Math.floor(w/2)-1] = T.TABLE;
    interiorMap[4][Math.floor(w/2)] = T.TABLE;
    interiorMap[5][Math.floor(w/2)-1] = T.CHAIR;
    interiorMap[5][Math.floor(w/2)] = T.CHAIR;
    for (let x = 4; x < w-4; x++)
      for (let y = h-4; y < h-2; y++) interiorMap[y][x] = T.CARPET;
    interiorMap[2][Math.floor(w/2)] = T.TV;
    interiorMap[2][1] = T.PLANT;
    interiorMap[2][w-2] = T.PLANT;
  } else if (furniture === 'grandma') {
    interiorMap[2][2] = T.BED;
    interiorMap[2][w-3] = T.BED;
    interiorMap[2][Math.floor(w/2)-1] = T.KITCHEN;
    interiorMap[2][Math.floor(w/2)] = T.KITCHEN;
    interiorMap[5][Math.floor(w/2)-1] = T.TABLE;
    interiorMap[5][Math.floor(w/2)] = T.TABLE;
    interiorMap[6][Math.floor(w/2)-1] = T.CHAIR;
    interiorMap[6][Math.floor(w/2)] = T.CHAIR;
    interiorMap[h-3][1] = T.FIREPLACE;
    interiorMap[2][w-2] = T.BOOKSHELF;
    interiorMap[h-2][w-2] = T.PLANT;
    interiorMap[h-3][w-2] = T.PLANT;
  } else if (furniture === 'school') {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const dx = 4 + col * 3, dy = 3 + row * 2;
        if (dx < w-2 && dy < h-2) interiorMap[dy][dx] = T.SCHOOL_DESK;
      }
    }
    for (let x = 3; x < w-3; x++) interiorMap[1][x] = T.BLACKBOARD;
    interiorMap[h-2][1] = T.BOOKSHELF;
    interiorMap[h-2][w-2] = T.BOOKSHELF;
    interiorMap[h-2][2] = T.PLANT;
  }

  // ---- Player ----
  const player = {
    x: Math.floor(w/2) * TILE + TILE/2,
    y: (h-2) * TILE + TILE/2,
    speed: 60, size: 10, dir: 0,
    moving: false, animTime: 0
  };

  const camera = { x: 0, y: 0 };
  const keys = {};
  let currentPath = [];
  let pathIndex = 0;

  // ---- NPCs ----
  const npcs = house.interior.npcs.map(n => ({
    x: n.x * TILE + TILE/2,
    y: n.y * TILE + TILE/2,
    data: n
  }));

  // ---- Dialogue state ----
  let dialogueActive = false;
  let dialogueNpc = null;
  let dialogueIndex = 0;
  let nearNpc = null;

  function isWalkable(tx, ty) {
    if (tx < 0 || tx >= w || ty < 0 || ty >= h) return false;
    const t = interiorMap[ty][tx];
    return t !== T.WALL && t !== T.BED && t !== T.TABLE && t !== T.CHAIR &&
           t !== T.BOOKSHELF && t !== T.TV && t !== T.KITCHEN &&
           t !== T.FIREPLACE && t !== T.SCHOOL_DESK && t !== T.PLANT &&
           t !== T.WINDOW;
  }

  // ---- UI ----
  document.getElementById('houseName').textContent = house.name;
  document.getElementById('exitBtn').addEventListener('click', exitHouse);
  document.getElementById('exitBtn').addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation(); exitHouse();
  }, { passive: false });

  document.getElementById('interactBtn').addEventListener('click', doInteract);
  document.getElementById('interactBtn').addEventListener('touchstart', (e) => {
    e.preventDefault(); e.stopPropagation(); doInteract();
  }, { passive: false });

  function exitHouse() {
    if (dialogueActive) endDialogue();
    // Return to overworld with saved position
    const rx = sessionStorage.getItem('returnX');
    const ry = sessionStorage.getItem('returnY');
    const params = rx && ry ? `?px=${rx}&py=${ry}` : '';
    window.location.href = '../game.html' + params;
  }

  function doInteract() {
    if (nearNpc && !dialogueActive) startDialogue(nearNpc);
  }

  function startDialogue(npc) {
    dialogueActive = true;
    dialogueNpc = npc;
    dialogueIndex = 0;
    showDialogueLine();
    document.getElementById('interactBtn').classList.remove('show');
    document.getElementById('interactLabel').classList.remove('show');
  }

  function showDialogueLine() {
    const npc = dialogueNpc;
    const box = document.getElementById('dialogueBox');
    const nameEl = document.getElementById('dialogueName');
    const textEl = document.getElementById('dialogueText');
    const choicesEl = document.getElementById('dialogueChoices');

    nameEl.textContent = npc.data.name;
    textEl.textContent = npc.data.dialogues[dialogueIndex];
    choicesEl.innerHTML = '';

    const isLast = dialogueIndex >= npc.data.dialogues.length - 1;
    const btn = document.createElement('button');
    btn.className = 'choiceBtn';
    btn.textContent = isLast ? '👋 Tạm biệt' : '▶ Tiếp tục';
    btn.addEventListener('click', isLast ? endDialogue : nextDialogueLine);
    choicesEl.appendChild(btn);

    box.classList.add('show');
  }

  function nextDialogueLine() { dialogueIndex++; showDialogueLine(); }

  function endDialogue() {
    dialogueActive = false;
    dialogueNpc = null;
    document.getElementById('dialogueBox').classList.remove('show');
  }

  // ---- Input ----
  canvas.addEventListener('click', (e) => {
    if (dialogueActive) return;
    const ww = screenToWorld(e.clientX, e.clientY, camera.x, camera.y);
    const tx = Math.floor(ww.x / TILE), ty = Math.floor(ww.y / TILE);
    const ptx = Math.floor(player.x / TILE), pty = Math.floor(player.y / TILE);
    const path = findPath(ptx, pty, tx, ty, isWalkable);
    if (path.length > 0) { currentPath = path; pathIndex = 1; }
  });

  canvas.addEventListener('touchstart', (e) => {
    if (e.target === canvas && !dialogueActive) {
      e.preventDefault();
      const touch = e.touches[0];
      const ww = screenToWorld(touch.clientX, touch.clientY, camera.x, camera.y);
      const tx = Math.floor(ww.x / TILE), ty = Math.floor(ww.y / TILE);
      const ptx = Math.floor(player.x / TILE), pty = Math.floor(player.y / TILE);
      const path = findPath(ptx, pty, tx, ty, isWalkable);
      if (path.length > 0) { currentPath = path; pathIndex = 1; }
    }
  }, { passive: false });

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
    const clamped = Math.min(dist, maxDist);
    const angle = Math.atan2(dy, dx);
    const nx = Math.cos(angle) * clamped;
    const ny = Math.sin(angle) * clamped;
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
    if (e.key === 'Escape') {
      if (dialogueActive) endDialogue();
      else exitHouse();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.key.toLowerCase()] = false; });

  // ---- Update ----
  function update(dt) {
    if (dialogueActive) return;

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
      const dx = targetX - player.x, dy = targetY - player.y;
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

    // Camera
    const roomW = w * TILE, roomH = h * TILE;
    camera.x = Math.max(0, Math.min(roomW - VW, player.x - VW/2));
    camera.y = Math.max(0, Math.min(roomH - VH, player.y - VH/2));
    if (roomW < VW) camera.x = (roomW - VW) / 2;
    if (roomH < VH) camera.y = (roomH - VH) / 2;

    // Check NPC proximity
    const ptx = player.x / TILE, pty = player.y / TILE;
    nearNpc = null;
    let nearestDist = Infinity;
    for (const npc of npcs) {
      const nx = npc.x / TILE, ny = npc.y / TILE;
      const dist = Math.sqrt((nx-ptx)**2 + (ny-pty)**2);
      if (dist < 1.8 && dist < nearestDist) {
        nearestDist = dist;
        nearNpc = npc;
      }
    }

    const btn = document.getElementById('interactBtn');
    const label = document.getElementById('interactLabel');
    if (nearNpc && !dialogueActive) {
      btn.classList.add('show');
      btn.textContent = '💬';
      label.textContent = '💬 Nói chuyện với ' + nearNpc.data.name;
      label.classList.add('show');
    } else {
      btn.classList.remove('show');
      label.classList.remove('show');
    }
  }

  // ---- Render ----
  function render() {
    ctx.fillStyle = '#2a1a0e';
    ctx.fillRect(0, 0, VW, VH);

    const startX = Math.floor(camera.x / TILE);
    const startY = Math.floor(camera.y / TILE);
    const endX = Math.ceil((camera.x + VW) / TILE);
    const endY = Math.ceil((camera.y + VH) / TILE);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x < 0 || x >= w || y < 0 || y >= h) continue;
        drawTile(ctx, interiorMap[y][x],
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

    for (const npc of npcs) {
      drawNpc(ctx, npc,
        Math.round(npc.x - camera.x),
        Math.round(npc.y - camera.y),
        nearNpc === npc);
    }

    drawPlayerSprite(ctx,
      Math.round(player.x - camera.x),
      Math.round(player.y - camera.y),
      player, player.size);

    const grad = ctx.createRadialGradient(VW/2, VH/2, VH/3, VW/2, VH/2, VH);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, VW, VH);
  }

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
