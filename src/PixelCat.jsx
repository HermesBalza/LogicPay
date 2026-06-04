import React, { useRef, useEffect } from 'react';
import sheetUrl from './assets/cat_sheet.png';

const SPRITE_SIZE = 32;
const RENDER_SCALE = 2;
const COLS = 11;

const ANIM_CONFIG = {
  walkRight:  { row: 6,  cols: 8, speed: 150 },
  walkLeft:   { row: 7,  cols: 8, speed: 150 },
  clean: { row: 36, cols: 9, speed: 350 },
  clean_echado: { row: 38, cols: 7, speed: 350 },
  scratchRight: { row: 39, cols: 11, speed: 200 },
  scratchLeft:  { row: 40, cols: 11, speed: 200 },
  boredLeft: { row: 12, cols: 2, speed: 600 },
  boredRight: { row: 13, cols: 2, speed: 600 },
  sleepLeft: { row: 16, cols: 2, speed: 800 },
  sleepRight: { row: 17, cols: 2, speed: 800 },
  deepSleepRight: { row: 18, cols: 2, speed: 1200 },
  deepSleepLeft: { row: 19, cols: 2, speed: 1200 },
  nervousLeft: { row: 41, cols: 2, speed: 400 },
  nervousRight: { row: 42, cols: 2, speed: 400 },
  playful: { row: 52, cols: 4, speed: 400 },
  chase: { row: 8,  cols: 6, speed: 100 },
};

function loadSheet(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

export default function PixelCat({ enabled }) {
  const canvasRef = useRef(null);
  const sheetRef = useRef(null);
  const loadedRef = useRef(false);
  const posRef = useRef({ x: 100, y: 10 });
  const velRef = useRef({ x: 0, y: 0 });
  const animRef = useRef({ state: 'clean', frame: 0, timer: 0 });
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const stateTimerRef = useRef(0);
  const nervousTimerRef = useRef(0);
  const nervousTargetRef = useRef('nervousLeft');
  const facingRef = useRef('right');
  const prevStateRef = useRef('clean');
  const walkTargetRef = useRef(null);
  const chaseTimerRef = useRef(0);
  const rafRef = useRef(null);
  const lastTimeRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    (async () => {
      const sheet = await loadSheet(sheetUrl);
      if (cancelled || !sheet) return;
      sheetRef.current = sheet;
      loadedRef.current = true;
    })();

    return () => { cancelled = true; };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      lastTimeRef.current = 0;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const loop = (time) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const dt = Math.min(time - lastTimeRef.current, 50);
      lastTimeRef.current = time;

      const anim = animRef.current;
      const pos = posRef.current;
      const vel = velRef.current;
      const mouse = mouseRef.current;

      anim.timer += dt;

      const cx = pos.x + (SPRITE_SIZE * RENDER_SCALE) / 2;
      const cy = pos.y + (SPRITE_SIZE * RENDER_SCALE) / 2;
      const dx = mouse.x - cx + 20;
      const dy = mouse.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      const isDeepSleep = (s) => s === 'deepSleepLeft' || s === 'deepSleepRight';
      const isSleep = (s) => s === 'sleepLeft' || s === 'sleepRight';
      const isBored = (s) => s === 'boredLeft' || s === 'boredRight';

      const isNight = () => {
        const h = new Date().getHours();
        return h >= 20 || h < 8;
      };

      const pickStationary = () => {
        const WEIGHTS = [
          { key: 'clean', w: 20, cond: true },
          { key: 'clean_echado', w: 20, cond: true },
          { key: 'scratch', w: 10, cond: true },
          { key: 'bored', w: 15, cond: true },
          { key: 'sleep', w: 15, cond: isBored(prevStateRef.current) },
          { key: 'deepSleep', w: 20, cond: isNight() && isSleep(prevStateRef.current) },
        ];
        const DUR = {
          clean: [50000, 70000],
          clean_echado: [300000, 600000],
          scratch: [3000, 5000],
          bored: [1500000, 1700000],
          sleep: [3600000, 5000000],
          deepSleep: [3600000, 5000000],
        };
        const total = WEIGHTS.reduce((s, e) => s + (e.cond ? e.w : 0), 0);
        let r = Math.random() * total;
        for (const e of WEIGHTS) {
          if (!e.cond) continue;
          r -= e.w;
          if (r <= 0) {
            const f = facingRef.current;
            let state;
            if (e.key === 'scratch') state = f === 'right' ? 'scratchRight' : 'scratchLeft';
            else if (e.key === 'bored') state = f === 'right' ? 'boredRight' : 'boredLeft';
            else if (e.key === 'sleep') state = f === 'right' ? 'sleepRight' : 'sleepLeft';
            else if (e.key === 'deepSleep') state = f === 'right' ? 'deepSleepRight' : 'deepSleepLeft';
            else state = e.key;
            const [min, max] = DUR[e.key];
            return { state, duration: min + Math.random() * (max - min) };
          }
        }
        return { state: 'clean', duration: 50000 + Math.random() * 20000 };
      };

      // --- state machine ---
      if (nervousTimerRef.current > 0) {
        anim.state = nervousTargetRef.current;
        vel.x = 0;
        vel.y = 0;
        nervousTimerRef.current -= dt;
      } else {
        stateTimerRef.current -= dt;

        if (stateTimerRef.current <= 0) {
          // Deep sleep persistence
          if (isDeepSleep(anim.state)) {
            if (isNight() && Math.random() < 0.9) {
              stateTimerRef.current = 3600000 + Math.random() * 1400000;
            } else {
              walkTargetRef.current = null;
              if (Math.random() < 0.1) {
                walkTargetRef.current = 1;
                const dir = Math.random() < 0.5 ? 1 : -1;
                vel.x = dir * 1.215;
                facingRef.current = dir > 0 ? 'right' : 'left';
                anim.state = dir > 0 ? 'walkRight' : 'walkLeft';
                stateTimerRef.current = 10000 + Math.random() * 10000;
              } else {
                const { state, duration } = pickStationary();
                anim.state = state;
                prevStateRef.current = state;
                stateTimerRef.current = duration;
                vel.x = 0;
                vel.y = 0;
              }
            }
          } else if (isSleep(anim.state) && isNight()) {
            walkTargetRef.current = null;
            const dir = facingRef.current;
            anim.state = dir === 'right' ? 'deepSleepRight' : 'deepSleepLeft';
            prevStateRef.current = anim.state;
            stateTimerRef.current = 3600000 + Math.random() * 1400000;
            vel.x = 0;
            vel.y = 0;
          } else if (Math.random() < 0.1) {
            walkTargetRef.current = 1;
            const dir = Math.random() < 0.5 ? 1 : -1;
            vel.x = dir * 1.215;
            facingRef.current = dir > 0 ? 'right' : 'left';
            anim.state = dir > 0 ? 'walkRight' : 'walkLeft';
            stateTimerRef.current = 10000 + Math.random() * 10000;
          } else {
            walkTargetRef.current = null;
            const { state, duration } = pickStationary();
            anim.state = state;
            prevStateRef.current = state;
            stateTimerRef.current = duration;
            vel.x = 0;
            vel.y = 0;
          }
        } else {
          if (walkTargetRef.current !== null) {
            const dir = vel.x > 0 ? 1 : -1;
            anim.state = dir > 0 ? 'walkRight' : 'walkLeft';
            facingRef.current = dir > 0 ? 'right' : 'left';
            vel.x = dir * 1.215;
          } else {
            vel.x = 0;
            vel.y = 0;
          }
        }
      }
      vel.y = 0;

      pos.x += vel.x * dt * 0.06;
      pos.y += vel.y * dt * 0.06;

      const maxX = window.innerWidth - SPRITE_SIZE * RENDER_SCALE;
      const maxY = 30;
      pos.x = Math.max(0, Math.min(maxX, pos.x));
      pos.y = Math.max(0, Math.min(maxY, pos.y));

      if (pos.x <= 0) { walkTargetRef.current = null; stateTimerRef.current = 0; }
      if (pos.x >= maxX) { walkTargetRef.current = null; stateTimerRef.current = 0; }

      const cfg = ANIM_CONFIG[anim.state];
      if (cfg && anim.timer >= cfg.speed) {
        anim.frame++;
        anim.timer = 0;
      }

      ctx.clearRect(0, 0, SPRITE_SIZE * RENDER_SCALE, SPRITE_SIZE * RENDER_SCALE);

      const sheet = sheetRef.current;
      if (sheet && cfg) {
        const frameIdx = anim.frame % cfg.cols;
        const sx = frameIdx * SPRITE_SIZE;
        const sy = cfg.row * SPRITE_SIZE;

        ctx.save();
        ctx.scale(RENDER_SCALE, RENDER_SCALE);
        ctx.drawImage(sheet, sx, sy, SPRITE_SIZE, SPRITE_SIZE, 0, 0, SPRITE_SIZE, SPRITE_SIZE);
        ctx.restore();
      }

      canvas.style.left = `${pos.x}px`;
      canvas.style.bottom = `${40 - pos.y}px`;

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [enabled]);

  const handleCatClick = () => {
    const current = animRef.current.state;
    if (current === 'deepSleepLeft' || current === 'deepSleepRight') return;
    if (velRef.current.x > 0) {
      nervousTargetRef.current = 'nervousRight';
      nervousTimerRef.current = 5000;
    } else if (velRef.current.x < 0) {
      nervousTargetRef.current = 'nervousLeft';
      nervousTimerRef.current = 5000;
    } else {
      nervousTargetRef.current = 'playful';
      nervousTimerRef.current = 5000 + Math.random() * 5000;
    }
  };

  if (!enabled) return null;

  return (
    <canvas
      ref={canvasRef}
      width={SPRITE_SIZE * RENDER_SCALE}
      height={SPRITE_SIZE * RENDER_SCALE}
      onClick={handleCatClick}
      style={{
        position: 'fixed',
        bottom: '40px',
        left: '100px',
        imageRendering: 'pixelated',
        cursor: 'pointer',
        zIndex: 55,
      }}
    />
  );
}
