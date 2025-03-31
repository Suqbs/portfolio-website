document.addEventListener("DOMContentLoaded", () => {
    const prefersReducedMotionQuery = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    );
    let prefersReducedMotion = prefersReducedMotionQuery.matches;
  
    function logReducedMotionStatus() {
      console.log(
        `Reduced Motion Preference: ${
          prefersReducedMotion ? "ACTIVE" : "INACTIVE"
        }`
      );
    }
    logReducedMotionStatus();
  
    const animationRegistry = {};
    let globalRafId = null;
  
    function globalAnimate() {
      let activeCanvases = 0;
      for (const canvasId in animationRegistry) {
        const state = animationRegistry[canvasId];
        if (
          state &&
          state.rafId !== null &&
          state.isVisible &&
          typeof state.animateFunc === "function"
        ) {
          try {
            state.animateFunc();
          } catch (e) {
            console.error(`Error in animation loop for ${canvasId}:`, e);
            state.rafId = null;
          }
          if (state.rafId !== null) activeCanvases++;
        }
      }
  
      if (activeCanvases > 0) {
        globalRafId = requestAnimationFrame(globalAnimate);
      } else {
        globalRafId = null;
      }
    }
  
    function startGlobalAnimationLoop() {
      if (globalRafId === null && !prefersReducedMotion) {
        globalRafId = requestAnimationFrame(globalAnimate);
      }
    }
  
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }
  
    function getCanvasContext(canvas) {
        if (!canvas || typeof canvas.getContext !== 'function') {
            console.error("Invalid canvas element provided.");
            return null;
        }
        const ctx = canvas.getContext("2d");
        if (!ctx) {
            console.error("Failed to get 2D context for canvas:", canvas.id);
        }
        return ctx;
    }
  
    function resizeCanvasToDisplaySize(canvas, state) {
        if (!canvas || !state) return false;
        const width = canvas.clientWidth;
        const height = canvas.clientHeight;
  
        if (width === 0 || height === 0) {
            return false; 
        }
  
        if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            if (typeof state.resizeFunc === 'function') {
                try {
                    state.resizeFunc();
                } catch (e) {
                    console.error(`Error during resize function for ${canvas.id}:`, e);
                }
            }
            return true;
        }
        return false;
    }
  
    function setupHeroCanvas() {
      const heroCanvas = document.getElementById("hero-canvas");
      const heroCtx = getCanvasContext(heroCanvas);
      if (!heroCtx) return;
  
      const canvasId = "hero-canvas";
      animationRegistry[canvasId] = {
        rafId: null,
        ctx: heroCtx,
        canvas: heroCanvas,
        isVisible: true,
        isHovering: false,
        instance: {
          particles: [],
          mouse: { x: null, y: null, radius: 100 },
        },
        animateFunc: heroAnimateParticles,
        resizeFunc: heroResizeCanvas,
        drawStaticFunc: heroDrawStatic,
      };
  
      function heroCreateParticle(state, x, y) {
        if (!state || !state.canvas) return null;
        const size = prefersReducedMotion
          ? Math.random() * 1 + 1
          : Math.random() * 2 + 1;
        const speedMultiplier = prefersReducedMotion ? 0.2 : 1.0;
        return {
          x: x ?? Math.random() * state.canvas.width,
          y: y ?? Math.random() * state.canvas.height,
          size: size,
          baseX: x,
          baseY: y,
          density: Math.random() * 30 + 1,
          color: `rgba(0, 240, 255, ${Math.random() * 0.5 + 0.2})`,
          vx: (Math.random() - 0.5) * 0.5 * speedMultiplier,
          vy: (Math.random() - 0.5) * 0.5 * speedMultiplier,
        };
      }
  
      function heroInitParticles() {
        const state = animationRegistry[canvasId];
        if (!state || !state.instance) return;
        state.instance.particles = [];
        const count = prefersReducedMotion ? 30 : 150;
        for (let i = 0; i < count; i++) {
          const particle = heroCreateParticle(state);
          if (particle) state.instance.particles.push(particle);
        }
      }
  
      function heroResizeCanvas() {
        const state = animationRegistry[canvasId];
        heroInitParticles();
        if (prefersReducedMotion) heroDrawStatic();
      }
  
      function heroUpdateParticlePositions(state) {
        if (!state || !state.instance?.particles || !state.canvas) return;
        state.instance.particles.forEach((p) => {
            let dx = state.instance.mouse.x - p.x;
            let dy = state.instance.mouse.y - p.y;
            let dist = Math.sqrt(dx * dx + dy * dy);
            if (dist === 0) dist = 1;
            let fdx = dx / dist;
            let fdy = dy / dist;
            let maxDist = state.instance.mouse.radius * (1 + (30 - p.density) / 30);
            let force = (maxDist - dist) / maxDist;
            let dirX = p.vx;
            let dirY = p.vy;
  
            if (dist < maxDist && state.instance.mouse.x != null) {
              dirX -= fdx * force * p.density * 0.1;
              dirY -= fdy * force * p.density * 0.1;
            }
  
            p.x += dirX;
            p.y += dirY;
  
            if (p.x > state.canvas.width + p.size) p.x = -p.size;
            if (p.x < -p.size) p.x = state.canvas.width + p.size;
            if (p.y > state.canvas.height + p.size) p.y = -p.size;
            if (p.y < -p.size) p.y = state.canvas.height + p.size;
        });
      }
  
      function heroDrawParticles(state) {
          if (!state || !state.ctx || !state.instance?.particles) return;
          state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
          state.instance.particles.forEach((p) => {
              state.ctx.fillStyle = p.color;
              state.ctx.beginPath();
              state.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              state.ctx.fill();
          });
      }
  
  
      function heroAnimateParticles() {
        const state = animationRegistry[canvasId];
        if (!state || !state.ctx || !state.instance?.particles) {
          if (state) state.rafId = null;
          return;
        }
  
        if (!prefersReducedMotion) {
            heroUpdateParticlePositions(state);
        }
  
        heroDrawParticles(state);
  
        state.rafId = prefersReducedMotion ? null : 1;
      }
  
      function heroDrawStatic() {
          const state = animationRegistry[canvasId];
          if (!state || !state.ctx || !state.instance?.particles) return;
          if (state.instance.particles.length === 0) {
              heroInitParticles();
          }
          heroDrawParticles(state);
      }
  
      if (resizeCanvasToDisplaySize(heroCanvas, animationRegistry[canvasId])) {
          if (prefersReducedMotion) {
              heroDrawStatic();
          } else {
              animationRegistry[canvasId].rafId = 1;
              startGlobalAnimationLoop();
          }
      } else {
          console.warn("Hero canvas initial resize failed or was unnecessary.");
          if (prefersReducedMotion) heroDrawStatic();
      }
  
      window.addEventListener("mousemove", (event) => {
        const state = animationRegistry[canvasId];
        if (state?.instance?.mouse && state.canvas) {
          const rect = state.canvas.getBoundingClientRect();
          state.instance.mouse.x = event.clientX - rect.left;
          state.instance.mouse.y = event.clientY - rect.top;
        }
      });
      window.addEventListener("mouseout", () => {
        const state = animationRegistry[canvasId];
        if (state?.instance?.mouse) {
          state.instance.mouse.x = null;
          state.instance.mouse.y = null;
        }
      });
    }
  
    function setupProjectCanvases() {
      const projectNodes = document.querySelectorAll(".project-node");
      function setupCanvas1(canvas, state) {
          const ctx = getCanvasContext(canvas);
          if (!ctx) return;
          state.ctx = ctx;
          state.instance = { stars: [], nebulaPatches: [], pulsarTime: 0, noiseCanvas: null };
          const numStars = prefersReducedMotion ? 15 : 50;
          const starColor = "rgba(200, 220, 255, 0.7)";
          const pulsarColor = "hsl(185, 100%, 80%)";
  
          function createNebulaTexture(width, height) {
              const offscreenCanvas = document.createElement("canvas");
              offscreenCanvas.width = Math.max(1, Math.floor(width / 4));
              offscreenCanvas.height = Math.max(1, Math.floor(height / 4));
              const offCtx = getCanvasContext(offscreenCanvas);
              if (!offCtx) return null;
              offCtx.fillStyle = "#0a0a0f";
              offCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
              const colors = [
                "rgba(0, 240, 255, 0.03)", "rgba(100, 150, 255, 0.05)", "rgba(200, 100, 255, 0.02)",
              ];
              for (let i = 0; i < 5; i++) {
                const grad = offCtx.createRadialGradient(
                  Math.random() * offscreenCanvas.width, Math.random() * offscreenCanvas.height, 0,
                  Math.random() * offscreenCanvas.width, Math.random() * offscreenCanvas.height,
                  Math.random() * offscreenCanvas.width * 0.6 + offscreenCanvas.width * 0.2
                );
                grad.addColorStop(0, colors[i % colors.length]); grad.addColorStop(1, "rgba(0,0,0,0)");
                offCtx.fillStyle = grad; offCtx.globalAlpha = Math.random() * 0.5 + 0.3;
                offCtx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
              }
              offCtx.globalAlpha = 1; return offscreenCanvas;
          }
  
          function init() {
              if (!state.canvas) return;
              state.instance.stars = [];
              for (let i = 0; i < numStars; i++) {
                state.instance.stars.push({
                  x: Math.random() * 2 - 1, y: Math.random() * 2 - 1,
                  z: Math.random() * state.canvas.width * 0.8 + state.canvas.width * 0.2,
                  size: Math.random() * 1.2 + 0.4,
                });
              }
              if (!prefersReducedMotion && state.canvas.width > 0 && state.canvas.height > 0) {
                state.instance.noiseCanvas = createNebulaTexture(state.canvas.width, state.canvas.height);
              } else {
                state.instance.noiseCanvas = null;
              }
              state.instance.pulsarTime = 0;
          }
  
          state.resizeFunc = init;
          state.drawStaticFunc = function () {
              if (!state.ctx || !state.instance || !state.canvas) return;
              if (state.instance.stars.length === 0) init();
              state.ctx.fillStyle = "#0a0a0f";
              state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
              state.ctx.fillStyle = starColor;
              state.instance.stars.forEach((star) => {
                const sx = (star.x * 0.3 + 0.5) * state.canvas.width;
                const sy = (star.y * 0.3 + 0.5) * state.canvas.height;
                state.ctx.beginPath(); state.ctx.arc(sx, sy, star.size * 0.7, 0, Math.PI * 2); state.ctx.fill();
              });
              const pulseSizeStatic = 5; state.ctx.fillStyle = pulsarColor; state.ctx.beginPath();
              state.ctx.arc(state.canvas.width / 2, state.canvas.height / 2, pulseSizeStatic, 0, Math.PI * 2);
              state.ctx.fill();
          };
          state.animateFunc = function () {
              if (!state.ctx || !state.instance || !state.canvas) { state.rafId = null; return; }
              if (prefersReducedMotion) { state.drawStaticFunc(); state.rafId = null; return; }
  
              state.instance.pulsarTime += state.isHovering ? 0.05 : 0.02; const speed = 0.05;
              state.ctx.fillStyle = "#0a0a0f"; state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
              if (state.instance.noiseCanvas) {
                state.ctx.globalAlpha = 0.6;
                state.ctx.drawImage(state.instance.noiseCanvas, 0, 0, state.canvas.width, state.canvas.height);
                state.ctx.globalAlpha = 1;
              }
              const basePulseSize = 5; const pulseAmplitude = 4;
              const currentPulseSize = basePulseSize + Math.sin(state.instance.pulsarTime) * pulseAmplitude;
              const glowRadius = currentPulseSize * 4 + Math.sin(state.instance.pulsarTime * 0.9 + 1) * 15;
              let grad = state.ctx.createRadialGradient(
                state.canvas.width / 2, state.canvas.height / 2, currentPulseSize * 0.5,
                state.canvas.width / 2, state.canvas.height / 2, Math.max(1, glowRadius)
              );
              grad.addColorStop(0, `hsla(185, 100%, 80%, ${0.6 + Math.sin(state.instance.pulsarTime * 1.1) * 0.3})`);
              grad.addColorStop(1, "rgba(0, 240, 255, 0)");
              state.ctx.fillStyle = grad; state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
              state.ctx.fillStyle = "white"; state.ctx.beginPath();
              state.ctx.arc(state.canvas.width / 2, state.canvas.height / 2, Math.max(1, currentPulseSize), 0, Math.PI * 2);
              state.ctx.fill(); state.ctx.fillStyle = pulsarColor; state.ctx.beginPath();
              state.ctx.arc(state.canvas.width / 2, state.canvas.height / 2, Math.max(1, currentPulseSize) * 0.6, 0, Math.PI * 2);
              state.ctx.fill(); state.ctx.fillStyle = starColor;
              const centerX = state.canvas.width / 2; const centerY = state.canvas.height / 2;
              state.instance.stars.forEach((star) => {
                star.z -= speed; if (star.z <= 0) { star.z = state.canvas.width; }
                const k = 128 / star.z; const px = star.x * k * centerX + centerX; const py = star.y * k * centerY + centerY;
                if (px >= 0 && px <= state.canvas.width && py >= 0 && py <= state.canvas.height) {
                  const size = (1 - star.z / state.canvas.width) * star.size * 1.5;
                  const alpha = (1 - star.z / (state.canvas.width * 1.2)) * 0.7;
                  state.ctx.fillStyle = `rgba(200, 220, 255, ${Math.max(0, alpha)})`;
                  state.ctx.beginPath(); state.ctx.arc(px, py, Math.max(0.1, size), 0, Math.PI * 2); state.ctx.fill();
                }
              });
              state.rafId = 1;
          };
      }
  
      function setupCanvas2(canvas, state) {
          const ctx = getCanvasContext(canvas);
          if (!ctx) return;
          state.ctx = ctx;
          state.instance = { neurons: [], connections: [], signals: [], pulseTime: 0 };
          const numNeurons = prefersReducedMotion ? 6 : 20;
          const neuronColor = `hsl(300, 100%, 70%)`; const connectionColor = "rgba(240, 0, 255, 0.15)";
          const pulseColor = `hsl(300, 100%, 90%)`; const signalColor = "hsl(50, 100%, 70%)";
          const maxSignals = 100;
  
          function init() {
              if (!state.canvas) return;
              state.instance.neurons = []; state.instance.connections = []; state.instance.signals = [];
              for (let i = 0; i < numNeurons; i++) {
                state.instance.neurons.push({
                  x: Math.random() * state.canvas.width * 0.8 + 0.1 * state.canvas.width,
                  y: Math.random() * state.canvas.height * 0.8 + 0.1 * state.canvas.height,
                  radius: prefersReducedMotion ? 3 : Math.random() * 2 + 3,
                  pulse: 0, lastPulse: 0, id: i,
                });
              }
              for (let i = 0; i < numNeurons; i++) {
                for (let j = i + 1; j < numNeurons; j++) {
                  if (Math.random() > 0.7) {
                    const n1 = state.instance.neurons[i]; const n2 = state.instance.neurons[j];
                    state.instance.connections.push({ n1, n2 });
                  }
                }
              }
              state.instance.pulseTime = 0;
          }
  
          state.resizeFunc = init;
          state.drawStaticFunc = function () {
              if (!state.ctx || !state.instance || !state.canvas) return;
              if (state.instance.neurons.length === 0) init();
              state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
              state.ctx.strokeStyle = connectionColor; state.ctx.lineWidth = 0.5;
              state.instance.connections.forEach((c) => {
                state.ctx.beginPath(); state.ctx.moveTo(c.n1.x, c.n1.y); state.ctx.lineTo(c.n2.x, c.n2.y); state.ctx.stroke();
              });
              state.ctx.fillStyle = neuronColor;
              state.instance.neurons.forEach((n) => {
                state.ctx.beginPath(); state.ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2); state.ctx.fill();
              });
          };
          state.animateFunc = function () {
              if (!state.ctx || !state.instance || !state.canvas) { state.rafId = null; return; }
              if (prefersReducedMotion) { state.drawStaticFunc(); state.rafId = null; return; }
              const pulseSpeed = state.isHovering ? 0.1 : 0.05;
              const signalSpeed = state.isHovering ? 1.5 : 1;
              state.instance.pulseTime += pulseSpeed; state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
              state.ctx.shadowColor = pulseColor;
              state.instance.neurons.forEach((n, i) => {
                const currentPulse = (Math.sin(state.instance.pulseTime * (1 + i * 0.1)) + 1) / 2;
                n.lastPulse = n.pulse; n.pulse = currentPulse;
                const radius = n.radius + n.pulse * 3; const color = n.pulse > 0.8 ? pulseColor : neuronColor;
                if (n.pulse > 0.9 && n.lastPulse <= 0.9 && state.instance.signals.length < maxSignals) {
                  state.instance.connections.forEach((c) => {
                    if (c.n1 === n || c.n2 === n) {
                      const targetNeuron = c.n1 === n ? c.n2 : c.n1;
                      if (Math.random() > 0.5) {
                        state.instance.signals.push({
                          x: n.x, y: n.y, targetX: targetNeuron.x, targetY: targetNeuron.y,
                          progress: 0, speed: (Math.random() * 0.02 + 0.01) * signalSpeed,
                        });
                      }
                    }
                  });
                }
                state.ctx.fillStyle = color;
                state.ctx.shadowBlur = n.pulse > 0.8 ? 15 * n.pulse : 0;
                state.ctx.beginPath(); state.ctx.arc(n.x, n.y, radius, 0, Math.PI * 2); state.ctx.fill();
              });
              state.ctx.shadowBlur = 0; state.ctx.strokeStyle = connectionColor; state.ctx.lineWidth = 0.5;
              state.instance.connections.forEach((c) => {
                state.ctx.beginPath(); state.ctx.moveTo(c.n1.x, c.n1.y); state.ctx.lineTo(c.n2.x, c.n2.y); state.ctx.stroke();
              });
              state.ctx.fillStyle = signalColor; state.ctx.shadowColor = signalColor; state.ctx.shadowBlur = 5;
              for (let i = state.instance.signals.length - 1; i >= 0; i--) {
                const s = state.instance.signals[i]; s.progress += s.speed;
                if (s.progress >= 1) { state.instance.signals.splice(i, 1); }
                else {
                  const dx = s.targetX - s.x; const dy = s.targetY - s.y;
                  const currentX = s.x + dx * s.progress; const currentY = s.y + dy * s.progress;
                  state.ctx.beginPath(); state.ctx.arc(currentX, currentY, 2, 0, Math.PI * 2); state.ctx.fill();
                }
              }
              state.ctx.shadowBlur = 0; state.rafId = 1;
          };
      }
  
      function setupCanvas3(canvas, state) {
          const ctx = getCanvasContext(canvas);
          if (!ctx) return;
          state.ctx = ctx;
          state.instance = { angleX: 0, angleY: 0, vertices: [], edges: [], glitchFactor: 0, cubeSize: 1 };
          const lineColor = `hsla(130, 100%, 60%, 0.7)`;
          state.instance.vertices = [ [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1], ];
          state.instance.edges = [ [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7], ];
  
          function rotate(p, aX, aY) {
              const [x, y, z] = p; const cY = Math.cos(aY), sY = Math.sin(aY);
              const x1 = x * cY - z * sY; const z1 = x * sY + z * cY;
              const cX = Math.cos(aX), sX = Math.sin(aX);
              const y2 = y * cX - z1 * sX; const z2 = y * sX + z1 * cX;
              return [x1, y2, z2];
          }
          function project(p, w, h, state) { 
              const [x, y, z] = p; const cS = state.instance.cubeSize;
              const pF = 400 / (400 + z * cS);
              const sX = w / 2 + x * cS * pF; const sY = h / 2 + y * cS * pF;
              return [sX, sY];
          }
          function init() {
              if (!state.canvas) return;
              state.instance.angleX = 0; state.instance.angleY = 0; state.instance.glitchFactor = 0;
              state.instance.cubeSize = Math.min(state.canvas.width, state.canvas.height) * 0.4;
          }
  
          state.resizeFunc = init;
          state.drawStaticFunc = function () {
              if (!state.ctx || !state.instance || !state.canvas) return;
              if (state.instance.cubeSize <= 1) init(); 
              state.ctx.clearRect(0, 0, state.canvas.width, state.canvas.height);
              state.ctx.strokeStyle = lineColor; state.ctx.lineWidth = 1.5;
              const projected = state.instance.vertices.map(v => project(rotate(v, 0.5, 0.5), state.canvas.width, state.canvas.height, state));
              state.instance.edges.forEach(([i, j]) => {
                state.ctx.beginPath(); state.ctx.moveTo(projected[i][0], projected[i][1]); state.ctx.lineTo(projected[j][0], projected[j][1]); state.ctx.stroke();
              });
          };
          state.animateFunc = function () {
              if (!state.ctx || !state.instance || !state.canvas) { state.rafId = null; return; }
              if (prefersReducedMotion) { state.drawStaticFunc(); state.rafId = null; return; }
              const rotSpeed = state.isHovering ? 0.02 : 0.005;
              state.instance.angleX += rotSpeed; state.instance.angleY += rotSpeed * 0.7;
              state.instance.glitchFactor = state.isHovering
                ? Math.min(1, state.instance.glitchFactor + Math.random() * 0.1)
                : Math.max(0, state.instance.glitchFactor - 0.05);
              state.ctx.fillStyle = "rgba(10, 10, 15, 0.25)"; state.ctx.fillRect(0, 0, state.canvas.width, state.canvas.height);
              state.ctx.strokeStyle = lineColor; state.ctx.lineWidth = 1.5;
              const projectedPoints = state.instance.vertices.map(v => project(rotate(v, state.instance.angleX, state.instance.angleY), state.canvas.width, state.canvas.height, state));
              state.instance.edges.forEach(([i, j]) => {
                const p1 = projectedPoints[i]; const p2 = projectedPoints[j];
                let gx1 = p1[0], gy1 = p1[1], gx2 = p2[0], gy2 = p2[1];
                let strokeStyle = lineColor; state.ctx.lineWidth = 1.5;
                if (state.instance.glitchFactor > 0 && Math.random() < state.instance.glitchFactor * 0.3) {
                  const shift = (Math.random() - 0.5) * 20 * state.instance.glitchFactor;
                  if (Math.random() > 0.5) gx1 += shift; else gy1 += shift;
                  if (Math.random() > 0.5) gx2 -= shift; else gy2 -= shift;
                  strokeStyle = Math.random() > 0.5 ? `hsla(${Math.random() * 360}, 100%, 70%, 0.9)` : "#ff0000";
                  state.ctx.lineWidth = Math.random() > 0.5 ? 3 : 1;
                }
                state.ctx.strokeStyle = strokeStyle; state.ctx.beginPath(); state.ctx.moveTo(gx1, gy1); state.ctx.lineTo(gx2, gy2); state.ctx.stroke();
              });
              state.rafId = 1;
          };
      }
  
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const canvas = entry.target.querySelector("canvas");
            if (!canvas) return;
            const canvasId = canvas.id;
            if (!canvasId || !animationRegistry[canvasId]) return;
  
            const state = animationRegistry[canvasId];
  
            if (entry.isIntersecting) {
              state.isVisible = true;
              const resized = resizeCanvasToDisplaySize(canvas, state);
  
              if (canvas.width > 0 && canvas.height > 0) {
                  if (!prefersReducedMotion) {
                      state.rafId = 1;
                      startGlobalAnimationLoop();
                  } else if (state.drawStaticFunc) {
                      try {
                          state.drawStaticFunc();
                      } catch (e) {
                          console.error(`Static draw error on intersect for ${canvasId}:`, e);
                      }
                  }
              } else {
                  state.isVisible = false;
                  state.rafId = null;
              }
  
            } else {
              state.isVisible = false;
              state.rafId = null;
            }
          });
        },
        { threshold: 0.05 }
      );
  
      projectNodes.forEach((node, index) => {
        const canvasId = `project-canvas-${index + 1}`;
        const canvas = node.querySelector(`#${canvasId}`);
        if (!canvas) {
          console.error(`Canvas element #${canvasId} not found.`);
          return;
        }
  
        animationRegistry[canvasId] = {
          rafId: null,
          isVisible: false,
          isHovering: false,
          ctx: null,
          canvas: canvas,
          instance: null,
          animateFunc: null,
          resizeFunc: null,
          drawStaticFunc: null,
        };
  
        const state = animationRegistry[canvasId];
  
        try {
          if (index === 0) setupCanvas1(canvas, state);
          else if (index === 1) setupCanvas2(canvas, state);
          else if (index === 2) setupCanvas3(canvas, state);
          else console.warn(`No setup function defined for project canvas index ${index}`);
        } catch (e) {
          console.error(`Error during setup function for ${canvasId}:`, e);
          delete animationRegistry[canvasId];
          return;
        }
  
        node.addEventListener("mouseenter", () => { if (state) state.isHovering = true; });
        node.addEventListener("mouseleave", () => { if (state) state.isHovering = false; });
        node.addEventListener("focusin", () => { if (state) state.isHovering = true; });
        node.addEventListener("focusout", () => { if (state) state.isHovering = false; });
  
         node.addEventListener("click", (e) => {
              if (e.target.closest(".project-links a")) return;
              console.log(`Node activated: ${node.querySelector("h3")?.textContent || 'Unknown'}`);
            });
         node.addEventListener("keypress", (e) => {
           if ((e.key === "Enter" || e.key === " ") && !e.target.closest(".project-links a")) {
             e.preventDefault();
             node.click();
           }
         });
  
        observer.observe(node);
      });
  
       const debouncedResizeHandler = debounce(() => {
          console.log("Window resize detected, checking canvases.");
          const heroState = animationRegistry['hero-canvas'];
          if (heroState && heroState.canvas) {
              if (resizeCanvasToDisplaySize(heroState.canvas, heroState)) {
                  if (prefersReducedMotion && heroState.drawStaticFunc) heroState.drawStaticFunc();
              }
          }
          projectNodes.forEach((node, index) => {
              const canvasId = `project-canvas-${index + 1}`;
              const state = animationRegistry[canvasId];
              if (state && state.isVisible && state.canvas) {
                  if (resizeCanvasToDisplaySize(state.canvas, state)) {
                     if (prefersReducedMotion && state.drawStaticFunc) {
                         try { state.drawStaticFunc(); } catch(e) { console.error(`Static draw error on resize for ${canvasId}`, e); }
                     }
                  }
              }
          });
      }, 250);
      window.addEventListener("resize", debouncedResizeHandler);
    }
  
    prefersReducedMotionQuery.addEventListener("change", () => {
      prefersReducedMotion = prefersReducedMotionQuery.matches;
      logReducedMotionStatus();
      console.log("Reduced motion preference changed. Re-evaluating animations.");
  
      for (const canvasId in animationRegistry) {
        const state = animationRegistry[canvasId];
        if (!state) continue;
  
        if (prefersReducedMotion) {
          state.rafId = null;
          if (state.isVisible && state.drawStaticFunc) {
            try {
              state.drawStaticFunc();
            } catch (e) {
              console.error(`Error static drawing ${canvasId} on pref change:`, e);
            }
          }
        } else {
          if (state.isVisible) {
            state.rafId = 1;
            startGlobalAnimationLoop();
          }
        }
      }
  
      if (prefersReducedMotion && globalRafId !== null) {
        cancelAnimationFrame(globalRafId);
        globalRafId = null;
        console.log("Global animation loop stopped due to reduced motion preference.");
      }
    });
  
    function setupMobileMenu() {
        const menuToggle = document.querySelector('.menu-toggle');
        const mainNav = document.querySelector('#main-nav');
  
        if (menuToggle && mainNav) {
          menuToggle.addEventListener('click', () => {
            const isActive = mainNav.classList.toggle('is-active');
            menuToggle.setAttribute('aria-expanded', String(isActive));
            menuToggle.classList.toggle('is-active', isActive);
          });
  
          mainNav.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
              if (mainNav.classList.contains('is-active')) {
                mainNav.classList.remove('is-active');
                menuToggle.setAttribute('aria-expanded', 'false');
                menuToggle.classList.remove('is-active');
              }
            });
          });
  
          document.addEventListener('click', (event) => {
              if (!mainNav.contains(event.target) && !menuToggle.contains(event.target) && mainNav.classList.contains('is-active')) {
                  mainNav.classList.remove('is-active');
                  menuToggle.setAttribute('aria-expanded', 'false');
                  menuToggle.classList.remove('is-active');
              }
          });
        } else {
            console.warn("Mobile menu toggle or nav element not found.");
        }
    }
  
    function setupCtaScroll() {
        const ctaProjects = document.getElementById('cta-projects');
        const ctaAbout = document.getElementById('cta-about');
        const projectsSection = document.getElementById('projects');
        const aboutSection = document.getElementById('about');
  
        const scrollOptions = { behavior: prefersReducedMotion ? 'auto' : 'smooth' };
  
        if (ctaProjects && projectsSection) {
            ctaProjects.addEventListener('click', () => {
                projectsSection.scrollIntoView(scrollOptions);
            });
        }
        if (ctaAbout && aboutSection) {
            ctaAbout.addEventListener('click', () => {
                aboutSection.scrollIntoView(scrollOptions);
            });
        }
    }
  
  
    try {
        setupHeroCanvas();
        setupProjectCanvases();
        setupMobileMenu();
        setupCtaScroll();
    } catch (error) {
        console.error("Error during initial page setup:", error);
    }
  
  });