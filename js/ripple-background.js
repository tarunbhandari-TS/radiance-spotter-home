/*
 * Ripple background — vanilla port of the "A to B" mode from the FINAL ripple
 * loader (MorphRipplePulse). Renders a centred field of brand-toned dots with
 * concentric ripple pulses (2 per second). Used as the Option-2 loading
 * background on /Spotterhome while an answer is generating.
 *
 * window.RippleBackground.start(container, { cx, cy, speed }) -> { stop() }
 *   cx, cy  — origin in container pixels (defaults to centre)
 *   speed   — multiplier: 1 = original, 0.5 = half speed (default)
 */
(() => {
    const DEFAULT_SPEED = 0.5;
    function getCycleSeconds(speed) { return 2.5 / Math.max(0.05, speed); }
    const MORPH_WINDOW = 0.78;
    const PHASE_LEAD_RATIO = 0.08;
    const GAP = 16;
    const PULSES_PER_SECOND = 2;

    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    function start(container, opts) {
        if (!container) return { stop() {} };
        opts = opts || {};
        let speed = (opts.speed != null) ? opts.speed : DEFAULT_SPEED;

        const canvas = document.createElement("canvas");
        canvas.style.display = "block";
        container.appendChild(canvas);
        const ctx = canvas.getContext("2d");

        let raf = 0;
        let width = 0;
        let height = 0;
        let cols = 0;
        let rows = 0;
        let elapsed = 0;
        // origin — updated by setOrigin or defaults to centre each frame
        let originX = (opts.cx != null) ? opts.cx : null;
        let originY = (opts.cy != null) ? opts.cy : null;

        const resize = () => {
            const dpr = window.devicePixelRatio || 1;
            width = container.clientWidth;
            height = container.clientHeight;
            if (!width || !height) return;
            canvas.width = width * dpr;
            canvas.height = height * dpr;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            cols = Math.ceil(width / GAP) + 1;
            rows = Math.ceil(height / GAP) + 1;
        };

        const resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(container);
        resize();

        const baseColor = { r: 119, g: 126, b: 139 };
        const glowColor = { r: 192, g: 198, b: 207 };
        const activeLift = 0.62;
        const activePush = 0.58;
        const activeGlow = 0.68;
        const toneOpacity = 1.02;
        const neutralVisibilityBoost = 1.12;
        const sizeBoost = 1.08;

        let lastTimestamp = null;
        const draw = (timestamp) => {
            const dt = lastTimestamp != null ? Math.min((timestamp - lastTimestamp) / 1000, 0.05) : 0.016;
            lastTimestamp = timestamp;
            elapsed += dt * speed;

            if (!width || !height) {
                raf = requestAnimationFrame(draw);
                return;
            }

            ctx.clearRect(0, 0, width, height);

            const cx = (originX != null) ? originX : width / 2;
            const cy = (originY != null) ? originY : height / 2;
            const maxDist = Math.sqrt(Math.max(cx, width - cx) ** 2 + Math.max(cy, height - cy) ** 2);
            const offsetX = (width - (cols - 1) * GAP) / 2;
            const offsetY = (height - (rows - 1) * GAP) / 2;

            // A-to-B frame: only the breathing cycle + morph energy are needed.
            const CYCLE_SECONDS = getCycleSeconds(speed);
            const cyclePosition = (elapsed + CYCLE_SECONDS * PHASE_LEAD_RATIO) / CYCLE_SECONDS;
            const cycleProgress = cyclePosition % 1;
            const morphEnergy = cycleProgress < MORPH_WINDOW
                ? Math.sin((cycleProgress / MORPH_WINDOW) * Math.PI)
                : 0;

            const rippleSpan = maxDist * 1.5;
            const pulseTravelSeconds = CYCLE_SECONDS * 2.6;
            const pulseInterval = 1 / PULSES_PER_SECOND;
            const pulseCount = Math.ceil(pulseTravelSeconds / pulseInterval) + 1;
            const pulseElapsed = elapsed;
            const currentPulseIndex = Math.floor(pulseElapsed / pulseInterval);

            for (let row = 0; row < rows; row += 1) {
                for (let col = 0; col < cols; col += 1) {
                    const baseX = offsetX + col * GAP;
                    const baseY = offsetY + row * GAP;
                    const dx = baseX - cx;
                    const dy = baseY - cy;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    const normDist = dist / maxDist;

                    let ripple = 0;
                    let tail = 0;
                    for (let pulseOffset = 0; pulseOffset < pulseCount; pulseOffset += 1) {
                        const pulseAge = pulseElapsed - (currentPulseIndex - pulseOffset) * pulseInterval;
                        if (pulseAge < 0 || pulseAge > pulseTravelSeconds) continue;
                        const pulseProgress = pulseAge / pulseTravelSeconds;
                        const pulseTravel = easeOutCubic(pulseProgress) * rippleSpan;
                        const rippleWidth = 72 + pulseProgress * 58;
                        const pulseStrength = 1 - pulseProgress * 0.45;
                        const pulseRipple = Math.max(0, 1 - Math.abs(pulseTravel - dist) / rippleWidth) * pulseStrength;
                        const pulseTail = Math.max(0, 1 - Math.abs((pulseTravel - rippleWidth * 1.15) - dist) / (rippleWidth * 2.4)) * 0.2 * pulseStrength;
                        ripple = Math.max(ripple, pulseRipple);
                        tail = Math.max(tail, pulseTail);
                    }

                    const breathe = 0.46 + Math.sin(cycleProgress * Math.PI * 2) * 0.08;
                    const combined = breathe + (ripple * 1.12 + tail) * activeLift;
                    const angle = Math.atan2(dy, dx);
                    const push = (ripple * 6.1 + tail * 2.2) * activePush;
                    const px = baseX + Math.cos(angle) * push;
                    const py = baseY + Math.sin(angle) * push;
                    const intensity = (0.12 + combined * 0.42 * activeGlow) * toneOpacity * neutralVisibilityBoost;
                    const size = (0.42 + combined * 1.02 * activeGlow) * sizeBoost;
                    const fade = 1 - normDist * 0.16;
                    const colorMix = Math.min(1, 0.18 + combined * 0.5 * activeGlow + morphEnergy * 0.12);
                    const r = Math.round(baseColor.r + (glowColor.r - baseColor.r) * colorMix);
                    const g = Math.round(baseColor.g + (glowColor.g - baseColor.g) * colorMix);
                    const b = Math.round(baseColor.b + (glowColor.b - baseColor.b) * colorMix);

                    ctx.beginPath();
                    ctx.arc(px, py, Math.max(0.42, size * 1.55), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${r},${g},${b},${intensity * 0.12 * fade})`;
                    ctx.fill();

                    ctx.beginPath();
                    ctx.arc(px, py, Math.max(0.38, size), 0, Math.PI * 2);
                    ctx.fillStyle = `rgba(${r},${g},${b},${intensity * fade})`;
                    ctx.fill();
                }
            }

            raf = requestAnimationFrame(draw);
        };

        raf = requestAnimationFrame(draw);

        return {
            setSpeed(s) { speed = Math.max(0.05, s); },
            setOrigin(x, y) { originX = x; originY = y; },
            stop() {
                cancelAnimationFrame(raf);
                resizeObserver.disconnect();
                canvas.remove();
            }
        };
    }

    window.RippleBackground = { start };
})();
