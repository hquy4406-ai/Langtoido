// ================== SHARED ENGINE ==================
(function(global) {
  'use strict';

  const TILE = 16;

  const T = {
    GRASS: 0, PATH: 1, WATER: 2, TREE: 3, HOUSE: 4,
    FLOWER: 5, FENCE: 6, BRIDGE: 7, SAND: 8, ROOF: 9,
    DOOR: 10,
    WOOD_FLOOR: 20, WALL: 21, BED: 22, TABLE: 23, CHAIR: 24,
    CARPET: 25, BOOKSHELF: 26, PLANT: 27, TV: 28, KITCHEN: 29,
    FIREPLACE: 30, RUG: 31, DOOR_INSIDE: 32, SOFA: 33, WINDOW: 34,
    SCHOOL_DESK: 35, BLACKBOARD: 36
  };

  // ---- A* Pathfinding ----
  function findPath(sx, sy, ex, ey, walkFn) {
    if (sx === ex && sy === ey) return [];
    if (!walkFn(ex, ey)) {
      let best = null, bestDist = Infinity;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = ex + dx, ny = ey + dy;
          if (walkFn(nx, ny)) {
            const d = dx*dx + dy*dy;
            if (d < bestDist) { bestDist = d; best = [nx, ny]; }
          }
        }
      }
      if (!best) return [];
      ex = best[0]; ey = best[1];
    }

    const open = [{x: sx, y: sy, g: 0, h: Math.abs(ex-sx)+Math.abs(ey-sy), parent: null}];
    const closed = new Set();
    const key = (x, y) => x + ',' + y;
    let iterations = 0;

    while (open.length > 0 && iterations < 5000) {
      iterations++;
      let bestIdx = 0;
      for (let i = 1; i < open.length; i++) {
        if (open[i].g + open[i].h < open[bestIdx].g + open[bestIdx].h) bestIdx = i;
      }
      const current = open.splice(bestIdx, 1)[0];

      if (current.x === ex && current.y === ey) {
        const path = [];
        let node = current;
        while (node) {
          path.unshift([node.x, node.y]);
          node = node.parent;
        }
        return path;
      }

      closed.add(key(current.x, current.y));
      const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
      for (const [dx, dy] of dirs) {
        const nx = current.x + dx;
        const ny = current.y + dy;
        if (!walkFn(nx, ny)) continue;
        if (closed.has(key(nx, ny))) continue;
        const g = current.g + 1;
        const h = Math.abs(ex - nx) + Math.abs(ey - ny);
        const existing = open.find(n => n.x === nx && n.y === ny);
        if (existing) {
          if (g < existing.g) { existing.g = g; existing.parent = current; }
        } else {
          open.push({x: nx, y: ny, g, h, parent: current});
        }
      }
    }
    return [];
  }

  // ---- Tile drawing ----
  function drawTile(ctx, t, sx, sy) {
    switch(t) {
      case T.GRASS:
        ctx.fillStyle = '#5a9e3a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#6aae4a';
        ctx.fillRect(sx + 2, sy + 3, 2, 2);
        ctx.fillRect(sx + 10, sy + 8, 2, 2);
        ctx.fillRect(sx + 6, sy + 12, 2, 2);
        break;
      case T.PATH:
        ctx.fillStyle = '#b89a6a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#a88a5a';
        ctx.fillRect(sx + 1, sy + 1, 3, 3);
        ctx.fillRect(sx + 8, sy + 6, 4, 4);
        ctx.fillRect(sx + 3, sy + 10, 3, 3);
        ctx.fillRect(sx + 11, sy + 2, 3, 3);
        break;
      case T.WATER:
        ctx.fillStyle = '#3a7abf';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#4a8acf';
        ctx.fillRect(sx + 2, sy + 4, 6, 2);
        ctx.fillRect(sx + 9, sy + 9, 5, 2);
        ctx.fillStyle = '#5a9adf';
        ctx.fillRect(sx + 5, sy + 7, 4, 1);
        break;
      case T.TREE:
        ctx.fillStyle = '#5a9e3a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(sx + 6, sy + 10, 4, 6);
        ctx.fillStyle = '#2d6e1e';
        ctx.fillRect(sx + 3, sy + 2, 10, 9);
        ctx.fillStyle = '#3a8a28';
        ctx.fillRect(sx + 4, sy + 3, 8, 7);
        ctx.fillStyle = '#4a9a38';
        ctx.fillRect(sx + 5, sy + 3, 6, 3);
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.fillRect(sx + 5, sy + 13, 7, 2);
        break;
      case T.HOUSE:
        ctx.fillStyle = '#d4b896';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#c4a886';
        ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(sx + 2, sy + 3, 4, 4);
        ctx.fillRect(sx + 10, sy + 3, 4, 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 3, sy + 4, 2, 2);
        ctx.fillRect(sx + 11, sy + 4, 2, 2);
        break;
      case T.DOOR:
        ctx.fillStyle = '#d4b896';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#c4a886';
        ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(sx + 3, sy + 2, 10, 14);
        ctx.fillStyle = '#8b6443';
        ctx.fillRect(sx + 4, sy + 3, 8, 12);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(sx + 10, sy + 9, 2, 2);
        ctx.fillStyle = '#a88a5a';
        ctx.fillRect(sx + 2, sy + 14, 12, 2);
        break;
      case T.ROOF:
        ctx.fillStyle = '#a03828';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#b84838';
        ctx.fillRect(sx, sy, TILE, 3);
        ctx.fillStyle = '#8a2818';
        ctx.fillRect(sx, sy + 12, TILE, 4);
        ctx.fillStyle = '#922818';
        for (let i = 0; i < TILE; i += 4) {
          ctx.fillRect(sx + i, sy + 4, 2, 8);
        }
        break;
      case T.FLOWER:
        ctx.fillStyle = '#5a9e3a';
        ctx.fillRect(sx, sy, TILE, TILE);
        const colors = ['#ff6b9d', '#ffeb3b', '#ff9a56', '#e066ff'];
        for (let i = 0; i < 3; i++) {
          const fx = sx + 3 + (i * 4);
          const fy = sy + 4 + (i % 2) * 5;
          ctx.fillStyle = colors[i % colors.length];
          ctx.fillRect(fx, fy, 3, 3);
          ctx.fillStyle = '#fff';
          ctx.fillRect(fx + 1, fy + 1, 1, 1);
        }
        break;
      case T.FENCE:
        ctx.fillStyle = '#5a9e3a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#8b6443';
        ctx.fillRect(sx + 2, sy + 4, 2, 10);
        ctx.fillRect(sx + 12, sy + 4, 2, 10);
        ctx.fillRect(sx, sy + 6, TILE, 2);
        ctx.fillRect(sx, sy + 10, TILE, 2);
        break;
      case T.BRIDGE:
        ctx.fillStyle = '#b89a6a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#8b6443';
        for (let i = 0; i < TILE; i += 4) {
          ctx.fillRect(sx, sy + i, TILE, 2);
        }
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(sx, sy, 2, TILE);
        ctx.fillRect(sx + 14, sy, 2, TILE);
        break;
      case T.SAND:
        ctx.fillStyle = '#e8d4a0';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#d8c490';
        ctx.fillRect(sx + 3, sy + 2, 2, 2);
        ctx.fillRect(sx + 9, sy + 7, 2, 2);
        ctx.fillRect(sx + 5, sy + 12, 2, 2);
        break;
      // Interior
      case T.WOOD_FLOOR:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#b8905a';
        ctx.fillRect(sx, sy + 7, TILE, 1);
        ctx.fillRect(sx, sy + 15, TILE, 1);
        ctx.fillStyle = '#a8804a';
        ctx.fillRect(sx + 7, sy, 1, 8);
        ctx.fillRect(sx + 3, sy + 8, 1, 8);
        break;
      case T.WALL:
        ctx.fillStyle = '#8b6f47';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#7a5f37';
        ctx.fillRect(sx, sy, TILE, 2);
        ctx.fillRect(sx, sy + 8, TILE, 2);
        ctx.fillStyle = '#6a4f27';
        for (let i = 0; i < TILE; i += 8) {
          ctx.fillRect(sx + i, sy, 1, 8);
          ctx.fillRect(sx + i + 4, sy + 8, 1, 8);
        }
        break;
      case T.BED:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, 4);
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(sx + 2, sy + 7, TILE - 4, TILE - 9);
        ctx.fillStyle = '#c0392b';
        ctx.fillRect(sx + 3, sy + 8, TILE - 6, 2);
        break;
      case T.TABLE:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#8b6443';
        ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#a8784a';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 5, sy + 5, 6, 6);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(sx + 7, sy + 7, 2, 2);
        break;
      case T.CHAIR:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#8b6443';
        ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = '#a8784a';
        ctx.fillRect(sx + 4, sy + 4, TILE - 8, TILE - 8);
        break;
      case T.CARPET:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#9b59b6';
        ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#8e44ad';
        ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 6);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(sx + 6, sy + 6, 4, 4);
        break;
      case T.BOOKSHELF:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        const bookColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6'];
        for (let i = 0; i < 5; i++) {
          ctx.fillStyle = bookColors[i];
          ctx.fillRect(sx + 2 + i * 2.5, sy + 3, 2, 10);
        }
        break;
      case T.PLANT:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(sx + 4, sy + 10, 8, 5);
        ctx.fillStyle = '#2d6e1e';
        ctx.fillRect(sx + 3, sy + 3, 10, 8);
        ctx.fillStyle = '#3a8a28';
        ctx.fillRect(sx + 5, sy + 5, 6, 5);
        break;
      case T.TV:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(sx + 1, sy + 2, TILE - 2, TILE - 5);
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(sx + 2, sy + 3, TILE - 4, TILE - 7);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 4, sy + 5, 3, 2);
        break;
      case T.KITCHEN:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#7f8c8d';
        ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#95a5a6';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(sx + 3, sy + 3, 3, 3);
        ctx.fillRect(sx + 10, sy + 3, 3, 3);
        break;
      case T.FIREPLACE:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#4a4a4a';
        ctx.fillRect(sx + 1, sy + 1, TILE - 2, TILE - 2);
        ctx.fillStyle = '#2c2c2c';
        ctx.fillRect(sx + 3, sy + 5, TILE - 6, TILE - 6);
        ctx.fillStyle = '#ff6b00';
        ctx.fillRect(sx + 5, sy + 8, 6, 5);
        ctx.fillStyle = '#ffeb3b';
        ctx.fillRect(sx + 6, sy + 9, 4, 3);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 7, sy + 10, 2, 1);
        break;
      case T.WINDOW:
        ctx.fillStyle = '#8b6f47';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#87ceeb';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 3, sy + 3, 4, 2);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(sx + 7, sy + 2, 2, TILE - 4);
        ctx.fillRect(sx + 2, sy + 7, TILE - 4, 2);
        break;
      case T.DOOR_INSIDE:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#6b4423';
        ctx.fillRect(sx + 2, sy + 2, TILE - 4, TILE - 2);
        ctx.fillStyle = '#8b6443';
        ctx.fillRect(sx + 3, sy + 3, TILE - 6, TILE - 4);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(sx + 11, sy + 8, 2, 2);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 6, sy + 5, 4, 2);
        ctx.fillRect(sx + 7, sy + 4, 2, 1);
        ctx.fillRect(sx + 7, sy + 7, 2, 1);
        break;
      case T.SCHOOL_DESK:
        ctx.fillStyle = '#c4a06a';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#a0522d';
        ctx.fillRect(sx + 2, sy + 6, TILE - 4, 8);
        ctx.fillStyle = '#8b6443';
        ctx.fillRect(sx + 2, sy + 6, TILE - 4, 2);
        ctx.fillStyle = '#3498db';
        ctx.fillRect(sx + 5, sy + 8, 6, 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 6, sy + 9, 4, 2);
        break;
      case T.BLACKBOARD:
        ctx.fillStyle = '#8b6f47';
        ctx.fillRect(sx, sy, TILE, TILE);
        ctx.fillStyle = '#2c3e50';
        ctx.fillRect(sx + 1, sy + 2, TILE - 2, TILE - 5);
        ctx.fillStyle = '#fff';
        ctx.fillRect(sx + 3, sy + 5, 5, 1);
        ctx.fillRect(sx + 3, sy + 7, 8, 1);
        ctx.fillRect(sx + 3, sy + 9, 6, 1);
        break;
      default:
        ctx.fillStyle = '#5a9e3a';
        ctx.fillRect(sx, sy, TILE, TILE);
    }
  }

  // ---- Draw player sprite ----
  function drawPlayerSprite(ctx, sx, sy, p, size) {
    const s = size;
    const px = sx - s/2;
    const py = sy - s/2;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx, py + s + 1, s/2, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    const bob = p.moving ? Math.sin(p.animTime * 12) * 1 : 0;
    const legOffset = p.moving ? Math.sin(p.animTime * 12) * 2 : 0;

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 1, py + s - 3 + legOffset, 3, 3);
    ctx.fillRect(px + s - 4, py + s - 3 - legOffset, 3, 3);

    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(px, py + 2 + bob, s, s - 4);

    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(px + 1, py - 3 + bob, s - 2, 5);

    ctx.fillStyle = '#3d2817';
    ctx.fillRect(px + 1, py - 4 + bob, s - 2, 2);
    ctx.fillRect(px, py - 3 + bob, 1, 3);
    ctx.fillRect(px + s - 1, py - 3 + bob, 1, 3);

    ctx.fillStyle = '#000';
    if (p.dir === 0) {
      ctx.fillRect(px + 2, py - 1 + bob, 1, 1);
      ctx.fillRect(px + s - 3, py - 1 + bob, 1, 1);
    } else if (p.dir === 2) {
      ctx.fillRect(px + 1, py - 1 + bob, 1, 1);
    } else if (p.dir === 3) {
      ctx.fillRect(px + s - 2, py - 1 + bob, 1, 1);
    }

    ctx.fillStyle = '#ffcc99';
    if (p.dir === 2) {
      ctx.fillRect(px - 1, py + 3 + bob, 2, 4);
    } else if (p.dir === 3) {
      ctx.fillRect(px + s - 1, py + 3 + bob, 2, 4);
    } else {
      ctx.fillRect(px - 1, py + 3 + bob, 2, 4);
      ctx.fillRect(px + s - 1, py + 3 + bob, 2, 4);
    }
  }

  // ---- Draw NPC ----
  function drawNpc(ctx, npc, sx, sy, highlight) {
    const s = 10;
    const px = sx - s/2;
    const py = sy - s/2;

    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(sx, py + s + 1, s/2, 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(px + 1, py + s - 3, 3, 3);
    ctx.fillRect(px + s - 4, py + s - 3, 3, 3);

    ctx.fillStyle = npc.data.color;
    ctx.fillRect(px, py + 2, s, s - 4);

    ctx.fillStyle = '#ffcc99';
    ctx.fillRect(px + 1, py - 3, s - 2, 5);

    ctx.fillStyle = npc.data.hair;
    ctx.fillRect(px + 1, py - 4, s - 2, 2);
    ctx.fillRect(px, py - 3, 1, 3);
    ctx.fillRect(px + s - 1, py - 3, 1, 3);

    ctx.fillStyle = '#000';
    ctx.fillRect(px + 2, py - 1, 1, 1);
    ctx.fillRect(px + s - 3, py - 1, 1, 1);

    if (highlight) {
      const bounce = Math.sin(Date.now() / 200) * 2;
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('!', sx, py - 8 + bounce);
      ctx.textAlign = 'left';
    }
  }

  // ---- Resize helper ----
  function setupCanvas(canvas, VW, VH) {
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    let scale = 1;

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scaleX = Math.floor(w / VW);
      const scaleY = Math.floor(h / VH);
      scale = Math.max(1, Math.min(scaleX, scaleY));
      if (scaleX < 1 || scaleY < 1) scale = Math.min(w / VW, h / VH);
      canvas.width = VW;
      canvas.height = VH;
      canvas.style.width = (VW * scale) + 'px';
      canvas.style.height = (VH * scale) + 'px';
    }
    window.addEventListener('resize', resize);
    resize();

    return {
      ctx,
      getScale: () => scale,
      screenToWorld: (clientX, clientY, camX, camY) => {
        const rect = canvas.getBoundingClientRect();
        return {
          x: (clientX - rect.left) / scale + camX,
          y: (clientY - rect.top) / scale + camY
        };
      }
    };
  }

  // ---- Expose to global ----
  global.Engine = {
    TILE, T, findPath, drawTile, drawPlayerSprite, drawNpc, setupCanvas
  };
})(window);
