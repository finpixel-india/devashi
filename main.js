/* ================================================================
   ASHISH SINGH — MAIN.JS
   Hero mask · Liquid physics · Decay · Idle hint reveal
   ================================================================ */

// ─── DOM ──────────────────────────────────────────────────────────
const hero = document.getElementById('hero');
const overlay = document.getElementById('overlayImg');
const container = document.getElementById('imageContainer');
const topoLayer = document.getElementById('topoLayer');

// ─── Hero State ───────────────────────────────────────────────────
const state = {
    targetX: -9999,
    targetY: -9999,
    currentX: -9999,
    currentY: -9999,

    viewX: 0,
    viewY: 0,

    active: false,
    decaying: false,
    hovering: false,       // is cursor inside the hero?

    maskSize: 0,
    targetMaskSize: 0,

    lerp: 0.07,
    sizeLerp: 0.06,

    fadeTimer: null,
    fadeDuration: 200,

    rect: null,
};

function updateRect() {
    if (overlay) state.rect = overlay.getBoundingClientRect();
}
updateRect();

function lerpFn(a, b, t) { return a + (b - a) * t; }

function toOverlayCoords(clientX, clientY) {
    const r = state.rect;
    return { x: clientX - r.left, y: clientY - r.top };
}

// ─── Auto-fade: overlay decays when cursor/finger stops ──────────
function resetFadeTimer() {
    if (state.fadeTimer) clearTimeout(state.fadeTimer);
    state.active = true;
    state.decaying = false;
    state.targetMaskSize = 250;

    state.fadeTimer = setTimeout(() => {
        state.decaying = true;
        state.targetMaskSize = 0;
    }, state.fadeDuration);
}

// ─── Hero Pointer Events ─────────────────────────────────────────
function onPointerMove(clientX, clientY) {
    // Cancel any active idle hint
    cancelIdleHint();
    state.idleHinting = false;

    const pos = toOverlayCoords(clientX, clientY);
    state.targetX = pos.x;
    state.targetY = pos.y;
    state.viewX = clientX;
    state.viewY = clientY;
    resetFadeTimer();
}

if (hero) {
    hero.addEventListener('mouseenter', () => {
        state.hovering = true;
        cancelIdleHint();
    });

    hero.addEventListener('mousemove', (e) => onPointerMove(e.clientX, e.clientY));

    hero.addEventListener('mouseleave', () => {
        state.hovering = false;
        if (state.fadeTimer) clearTimeout(state.fadeTimer);
        state.decaying = true;
        state.targetMaskSize = 0;
        // Restart idle hint cycle after the cursor leaves
        scheduleIdleHint();
    });

    // ─── TOUCH SUPPORT ──────────────────────────────────────
    hero.addEventListener('touchstart', (e) => {
        updateRect();
        state.hovering = true;
        cancelIdleHint();
        const t = e.touches[0];
        onPointerMove(t.clientX, t.clientY);
    }, { passive: true });

    hero.addEventListener('touchmove', (e) => {
        // e.preventDefault(); // allow scrolling
        const t = e.touches[0];
        onPointerMove(t.clientX, t.clientY);
    }, { passive: true });

    hero.addEventListener('touchend', () => {
        state.hovering = false;
        if (state.fadeTimer) clearTimeout(state.fadeTimer);
        state.decaying = true;
        state.targetMaskSize = 0;
        scheduleIdleHint();
    });
}

// ─── Idle "Hint" Reveal ──────────────────────────────────────────
// When user is NOT interacting, auto-sweep the overlay mask across
// the face every few seconds as a visual hint.
let idleHintTimer = null;
let idleHintAnim = null;
state.idleHinting = false;

function scheduleIdleHint() {
    cancelIdleHint();
    idleHintTimer = setTimeout(() => {
        if (!state.hovering) startIdleHint();
    }, 3000); // 3s after last interaction
}

function cancelIdleHint() {
    if (idleHintTimer) { clearTimeout(idleHintTimer); idleHintTimer = null; }
    if (idleHintAnim) { cancelAnimationFrame(idleHintAnim); idleHintAnim = null; }
}

function startIdleHint() {
    if (!overlay || !state.rect) return;
    state.idleHinting = true;

    const rect = state.rect;
    const centerX = rect.width * 0.5;   // Center of the face
    const centerY = rect.height * 0.35; // Upper-mid face (forehead/eyes area)

    // Set the sweep starting position
    state.targetX = centerX - 60;
    state.targetY = centerY;
    state.currentX = centerX - 60;
    state.currentY = centerY;
    state.active = true;
    state.decaying = false;

    const duration = 1800; // 1.8s sweep
    const start = performance.now();

    function hintStep(now) {
        const elapsed = now - start;
        const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;

        if (t < 0.6) {
            // Phase 1: grow mask + sweep across (0% → 60%)
            const sweepT = t / 0.6;
            state.targetX = centerX - 60 + sweepT * 120;
            state.targetY = centerY + Math.sin(sweepT * Math.PI) * 15;
            state.targetMaskSize = 180 * Math.min(sweepT * 2, 1);
        } else {
            // Phase 2: decay mask (60% → 100%)
            const decayT = (t - 0.6) / 0.4;
            state.targetMaskSize = 180 * (1 - decayT);
        }

        state.currentX = lerpFn(state.currentX, state.targetX, 0.12);
        state.currentY = lerpFn(state.currentY, state.targetY, 0.12);
        state.maskSize = lerpFn(state.maskSize, state.targetMaskSize, 0.10);

        overlay.style.setProperty('--mx', `${state.currentX}px`);
        overlay.style.setProperty('--my', `${state.currentY}px`);
        overlay.style.setProperty('--mask-size', `${state.maskSize}px`);

        if (t < 1 && !state.hovering) {
            idleHintAnim = requestAnimationFrame(hintStep);
        } else {
            // Reset after hint
            state.active = false;
            state.idleHinting = false;
            state.targetMaskSize = 0;
            state.maskSize = 0;
            state.currentX = -9999;
            state.currentY = -9999;
            overlay.style.setProperty('--mx', '-9999px');
            overlay.style.setProperty('--my', '-9999px');
            overlay.style.setProperty('--mask-size', '0px');
            // Schedule next hint
            if (!state.hovering) scheduleIdleHint();
        }
    }

    idleHintAnim = requestAnimationFrame(hintStep);
}

// Start the first idle hint cycle on page load
scheduleIdleHint();

// ─── Debounced resize ─────────────────────────────────────────────
let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(updateRect, 100);
});

// ─── Hero Animation Loop ─────────────────────────────────────────
function tick() {
    // Skip tick updates when idle hint is running (it has its own loop)
    if (overlay && !state.idleHinting) {
        state.maskSize = lerpFn(state.maskSize, state.targetMaskSize, state.sizeLerp);

        if (state.active && !state.decaying) {
            state.currentX = lerpFn(state.currentX, state.targetX, state.lerp);
            state.currentY = lerpFn(state.currentY, state.targetY, state.lerp);
        } else if (state.decaying) {
            state.currentX = lerpFn(state.currentX, state.targetX, state.lerp);
            state.currentY = lerpFn(state.currentY, state.targetY, state.lerp);

            if (state.maskSize < 2) {
                state.active = false;
                state.decaying = false;
                state.currentX = -9999;
                state.currentY = -9999;
            }
        } else {
            state.currentX = lerpFn(state.currentX, -400, state.lerp * 0.5);
            state.currentY = lerpFn(state.currentY, -400, state.lerp * 0.5);
        }

        overlay.style.setProperty('--mx', `${state.currentX}px`);
        overlay.style.setProperty('--my', `${state.currentY}px`);
        overlay.style.setProperty('--mask-size', `${state.maskSize}px`);
    }

    // Subtle parallax on topo lines
    if (topoLayer) {
        const hw = window.innerWidth / 2;
        const hh = window.innerHeight / 2;
        const px = ((state.viewX - hw) / hw) * 12;
        const py = ((state.viewY - hh) / hh) * 8;
        topoLayer.style.transform = `translate(${px}px, ${py}px)`;
    }

    requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
window.addEventListener('load', updateRect);


// ═══════════════════════════════════════════════════════════════
//  SCROLL REVEAL — Intersection Observer
// ═══════════════════════════════════════════════════════════════
const revealElements = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
        }
    });
}, {
    threshold: 0.15,
    rootMargin: '0px 0px -60px 0px',
});

revealElements.forEach((el) => revealObserver.observe(el));


// ═══════════════════════════════════════════════════════════════
//  STAT COUNTERS — Animated counting on scroll
// ═══════════════════════════════════════════════════════════════
const statNumbers = document.querySelectorAll('.stat-card__number');

function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1800;
    const start = performance.now();

    function step(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - progress, 3);
        el.textContent = Math.round(target * ease);
        if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

const statObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            animateCounter(entry.target);
            statObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.5 });

statNumbers.forEach((el) => statObserver.observe(el));


// ═══════════════════════════════════════════════════════════════
//  SKILL BARS — Animate width on scroll
// ═══════════════════════════════════════════════════════════════
const skillBars = document.querySelectorAll('.tech-item__fill');

const barObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            const width = entry.target.dataset.width;
            entry.target.style.width = width + '%';
            entry.target.classList.add('is-filled');
            barObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.3 });

skillBars.forEach((el) => barObserver.observe(el));


// ═══════════════════════════════════════════════════════════════
//  CODE TYPING ANIMATION
// ═══════════════════════════════════════════════════════════════
const codeLines = [
    { indent: 0, text: '<span class="code-kw">const</span> <span class="code-fn">AshishSingh</span> = <span class="code-kw">async</span> () => {' },
    { indent: 1, text: '<span class="code-cm">// Initializing a developer who actually finishes projects...</span>' },
    { indent: 1, text: '<span class="code-kw">const</span> stack = <span class="code-kw">await</span> <span class="code-fn">loadEverything</span>({' },
    { indent: 2, text: 'frontend: <span class="code-str">"React, Next.js, Tailwind"</span>,' },
    { indent: 2, text: 'backend: <span class="code-str">"Node.js, Supabase, PostgreSQL"</span>,' },
    { indent: 2, text: 'caffeine: <span class="code-num">Infinity</span>,' },
    { indent: 1, text: '});' },
    { indent: 0, text: '' },
    { indent: 1, text: '<span class="code-cm">// Warning: May cause imposter syndrome in other devs</span>' },
    { indent: 1, text: '<span class="code-kw">if</span> (bug.<span class="code-fn">exists</span>()) {' },
    { indent: 2, text: '<span class="code-fn">console</span>.<span class="code-fn">log</span>(<span class="code-str">"It\'s not a bug, it\'s a feature™"</span>);' },
    { indent: 1, text: '}' },
    { indent: 0, text: '' },
    { indent: 1, text: '<span class="code-kw">return</span> <span class="code-str">"pixel-perfect, production-ready"</span>;' },
    { indent: 0, text: '};' },
];

function initCodeTyping() {
    const codeBody = document.getElementById('codeBody');
    if (!codeBody) return;

    let lineIdx = 0;
    let charIdx = 0;
    let currentLineEl = null;

    function getPlainLength(html) {
        return html.replace(/<[^>]*>/g, '').length;
    }

    function getPartialHtml(html, visibleChars) {
        let result = '';
        let visible = 0;
        let i = 0;
        while (i < html.length && visible < visibleChars) {
            if (html[i] === '<') {
                const end = html.indexOf('>', i);
                result += html.substring(i, end + 1);
                i = end + 1;
            } else {
                result += html[i];
                visible++;
                i++;
            }
        }
        // Close any unclosed span tags
        const opens = (result.match(/<span[^>]*>/g) || []).length;
        const closes = (result.match(/<\/span>/g) || []).length;
        for (let j = 0; j < opens - closes; j++) result += '</span>';
        return result;
    }

    function typeTick() {
        if (lineIdx >= codeLines.length) {
            // Restart after pause
            setTimeout(() => {
                codeBody.innerHTML = '';
                lineIdx = 0;
                charIdx = 0;
                currentLineEl = null;
                typeTick();
            }, 4000);
            return;
        }

        const line = codeLines[lineIdx];
        const indent = '  '.repeat(line.indent);
        const plainLen = getPlainLength(line.text);

        if (charIdx === 0) {
            currentLineEl = document.createElement('div');
            currentLineEl.className = 'code-line';
            currentLineEl.innerHTML = `<span class="code-ln">${String(lineIdx + 1).padStart(2)}</span>${indent}<span class="code-cursor">▌</span>`;
            codeBody.appendChild(currentLineEl);
            codeBody.scrollTop = codeBody.scrollHeight;
        }

        if (charIdx <= plainLen) {
            const partial = getPartialHtml(line.text, charIdx);
            currentLineEl.innerHTML = `<span class="code-ln">${String(lineIdx + 1).padStart(2)}</span>${indent}${partial}<span class="code-cursor">▌</span>`;
            charIdx++;
            setTimeout(typeTick, 25 + Math.random() * 35);
        } else {
            // Remove cursor from finished line
            currentLineEl.innerHTML = currentLineEl.innerHTML.replace('<span class="code-cursor">▌</span>', '');
            lineIdx++;
            charIdx = 0;
            setTimeout(typeTick, 150 + Math.random() * 200);
        }
    }

    // Start typing when section scrolls into view
    const codeSection = document.querySelector('.code-window');
    if (codeSection) {
        const codeObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    typeTick();
                    codeObserver.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        codeObserver.observe(codeSection);
    }
}

initCodeTyping();


// ═══════════════════════════════════════════════════════════════
//  LUCIDE ICONS — Initialize
// ═══════════════════════════════════════════════════════════════
if (window.lucide) {
    window.lucide.createIcons();
}

// ═══════════════════════════════════════════════════════════════
//  CONTACT FORM — Character Animation System (ALIVE V2)
// ═══════════════════════════════════════════════════════════════
(function initContactForm() {
    const charsEl = document.getElementById('contactChars');
    const formEl = document.getElementById('contactFormEl');
    const nameInput = document.getElementById('contactName');
    const emailInput = document.getElementById('contactEmail');
    const messageInput = document.getElementById('contactMessage');
    const submitBtn = document.getElementById('contactSubmitBtn');
    const successEl = document.getElementById('contactSuccess');

    if (!charsEl || !formEl) return;

    let activeField = null;
    let isHovering = false;
    let blinkTimers = [];

    // ─── Set character state ──────────────────────────────────────
    function setCharState(state) {
        charsEl.setAttribute('data-char-state', state);
    }

    // ─── Global Mouse Tracking (Eyes follow cursor) ───────────────
    // This makes them feel "Alive" and "Watching"
    document.addEventListener('mousemove', (e) => {
        // Only track if not focused on input (input has its own tracking)
        if (activeField) return;

        // Get center of characters
        const rect = charsEl.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;

        // Calculate offset from center
        const dx = e.clientX - centerX;
        const dy = e.clientY - centerY;

        // Limit the movement range (max 8px eye shift)
        // Using atan2 for angle, distance clamping for magnitude
        const angle = Math.atan2(dy, dx);
        const dist = Math.min(Math.sqrt(dx * dx + dy * dy), 300); // 300px radius of influence

        // Map distance 0-300 to shift 0-8
        const shift = (dist / 300) * 8;

        const moveX = Math.cos(angle) * shift;
        const moveY = Math.sin(angle) * shift;

        charsEl.style.setProperty('--pupil-x', `${moveX.toFixed(1)}px`);
        charsEl.style.setProperty('--pupil-y', `${moveY.toFixed(1)}px`);
    });

    // ─── Focus / Blur handlers ────────────────────────────────────
    function onFieldFocus(field) {
        activeField = field;
        isHovering = false;
        setCharState(field);

        // When focusing, look slightly down-right towards form
        charsEl.style.setProperty('--pupil-x', '6px');
        charsEl.style.setProperty('--pupil-y', '2px');
    }

    function onFieldBlur(e) {
        activeField = null;
        if (isHovering) return;

        if (!e.target.value.trim() && e.target.hasAttribute('required')) {
            setCharState('sad'); // Disappointed
        } else {
            setCharState('idle');
        }
    }

    // Attach listeners
    [nameInput, emailInput, messageInput].forEach(input => {
        const fieldName = input.name;
        input.addEventListener('focus', () => onFieldFocus(fieldName));
        input.addEventListener('blur', onFieldBlur);
    });

    // ─── Message typing — eyes track horizontally ─────────────────
    messageInput.addEventListener('input', () => {
        if (activeField !== 'message') return;

        const text = messageInput.value;
        const len = text.length;

        // Scan back and forth
        const scan = (len % 50) / 25; // 0 to 2
        const xPos = scan > 1 ? (2 - scan) * 10 : scan * 10; // Triangle wave 0->10->0

        charsEl.style.setProperty('--pupil-x', `${(xPos + 2).toFixed(1)}px`); // range 2 to 12
        charsEl.style.setProperty('--pupil-y', '2px');
    });

    // ─── Submit button hover ──────────────────────────────────────
    submitBtn.addEventListener('mouseenter', () => {
        if (activeField) return;
        isHovering = true;
        setCharState('hover');
        // Look Excited (Up)
        charsEl.style.setProperty('--pupil-x', '0px');
        charsEl.style.setProperty('--pupil-y', '-6px');
    });

    submitBtn.addEventListener('mouseleave', () => {
        isHovering = false;
        if (!activeField) {
            setCharState('idle');
        } else {
            setCharState(activeField);
        }
    });

    // ─── Form submit ──────────────────────────────────────────────
    formEl.addEventListener('submit', (e) => {
        e.preventDefault();
        setCharState('success');
        successEl.classList.add('is-visible');
        setTimeout(() => {
            successEl.classList.remove('is-visible');
            formEl.reset();
            setCharState('idle');
        }, 4000);
    });

    // ─── Blink System ─────────────────────────────────────────────
    const chars = charsEl.querySelectorAll('.char');

    function triggerBlink(charEl) {
        charEl.classList.add('is-blinking');
        // Match CSS animation duration (0.15s)
        setTimeout(() => charEl.classList.remove('is-blinking'), 150);
    }

    function scheduleRandomBlinks() {
        chars.forEach((charEl) => {
            function blinkLoop() {
                // Random interval 2s to 6s
                const delay = 2000 + Math.random() * 4000;
                const timer = setTimeout(() => {
                    const state = charsEl.getAttribute('data-char-state');
                    // Blink unless 'success' (wide eyed)
                    if (state !== 'success') {
                        triggerBlink(charEl);
                    }
                    blinkLoop();
                }, delay);
                blinkTimers.push(timer);
            }
            blinkLoop();
        });
    }

    scheduleRandomBlinks();

})();
