/* ==========================================================
   Detalles interactivos: partículas, utensilios, secretos,
   diseñador de tartas y carta de encargo.
   Todo es opcional: si algo falla, el portfolio sigue funcionando.
   ========================================================== */
(() => {
    'use strict';

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const LINE = '#8a7466';
    const GOLD_LINE = '#a8814f';
    const GOLDS = ['#c9a46c', '#e3c98f', '#b48a57', '#f1e2c0'];
    const BLUSH = ['#e9bfbf', '#f3d9da', '#d99a9f'];
    const IVORY = ['#fffaf2', '#ffffff', '#f6eee1'];

    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const rand = (min, max) => min + Math.random() * (max - min);

    const safe = (name, fn) => {
        try { fn(); } catch (err) { console.warn(`[fun] ${name}:`, err); }
    };

    const restart = (el, cls) => {
        el.classList.remove(cls);
        void el.offsetWidth;
        el.classList.add(cls);
    };

    const store = {
        get(key, fallback) {
            try {
                const value = JSON.parse(localStorage.getItem(key));
                return value ?? fallback;
            } catch {
                return fallback;
            }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* sin almacenamiento */ }
        }
    };

    /* ---------- Motor de partículas (un solo canvas) ---------- */

    const canvas = document.getElementById('fx-canvas');
    const ctx = canvas.getContext('2d');
    let particles = [];
    let running = false;
    let lastTime = 0;
    let W = 0;
    let H = 0;

    function resizeCanvas() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = window.innerWidth;
        H = window.innerHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    function spawn(p) {
        p.age = 0;
        particles.push(p);
        if (!running) {
            running = true;
            lastTime = 0;
            requestAnimationFrame(loop);
        }
    }

    function loop(t) {
        const dt = lastTime ? Math.min(2, (t - lastTime) / 16.67) : 1;
        lastTime = t;
        ctx.clearRect(0, 0, W, H);
        particles = particles.filter(p => {
            p.life -= dt;
            p.age += dt;
            if (p.life <= 0 || p.y > H + 80) return false;
            p.vx *= p.drag;
            p.vy = p.vy * p.drag + p.g * dt;
            p.x += p.vx * dt + (p.sway ? Math.sin(p.age * 0.05 + p.phase) * p.sway : 0);
            p.y += p.vy * dt;
            p.rot += p.vr * dt;
            drawParticle(p, Math.min(1, p.life / 20) * (p.alpha ?? 1));
            return true;
        });
        if (particles.length) {
            requestAnimationFrame(loop);
        } else {
            running = false;
            ctx.clearRect(0, 0, W, H);
        }
    }

    function drawParticle(p, alpha) {
        const s = p.size;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        if (p.flutter) ctx.scale(Math.cos(p.age * 0.12 + p.phase), 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        switch (p.shape) {
            case 'sparkle':
                ctx.moveTo(0, -s * 1.6);
                ctx.quadraticCurveTo(0, 0, s * 1.6, 0);
                ctx.quadraticCurveTo(0, 0, 0, s * 1.6);
                ctx.quadraticCurveTo(0, 0, -s * 1.6, 0);
                ctx.quadraticCurveTo(0, 0, 0, -s * 1.6);
                ctx.fill();
                break;
            case 'flake':
                ctx.moveTo(-s, -s * 0.4);
                ctx.lineTo(s * 0.6, -s * 0.75);
                ctx.lineTo(s, s * 0.3);
                ctx.lineTo(-s * 0.3, s * 0.7);
                ctx.closePath();
                ctx.fill();
                break;
            case 'petal':
                ctx.ellipse(0, 0, s, s * 0.55, 0, 0, Math.PI * 2);
                ctx.fill();
                break;
            case 'cloud':
                ctx.arc(0, 0, s, 0, Math.PI * 2);
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(168, 129, 79, .35)';
                ctx.stroke();
                break;
            default:
                ctx.arc(0, 0, s, 0, Math.PI * 2);
                ctx.fill();
        }
        ctx.restore();
    }

    const BURSTS = {
        sparkles: { n: 7, speed: [1.5, 4], shape: 'sparkle', size: [2.5, 4.5], g: 0.02, drag: 0.93, life: [28, 46], colors: GOLDS },
        confetti: { n: 46, speed: [5, 11], shape: ['flake', 'petal'], size: [4, 7.5], g: 0.1, life: [90, 140], colors: [...GOLDS, ...BLUSH, '#fffaf2'], up: true, flutter: true, sway: 0.5 },
        hearts: { n: 8, speed: [1.2, 3.5], shape: 'petal', size: [3.5, 6.5], g: -0.025, life: [45, 75], colors: BLUSH, flutter: true },
        flour: { n: 18, speed: [0.8, 3.5], shape: 'dot', size: [1.5, 4], g: 0.015, drag: 0.93, life: [40, 70], colors: IVORY, alpha: 0.9 },
        meringue: { n: 14, speed: [1.5, 5], shape: 'cloud', size: [5, 12], g: -0.025, drag: 0.95, life: [50, 80], colors: IVORY },
        crumbs: { n: 14, speed: [1.5, 4.5], shape: 'dot', size: [1.2, 3], g: 0.3, life: [40, 60], colors: ['#ecd2d0', '#fffaf2', '#c9a46c'] },
        frosting: { n: 10, speed: [1.2, 3], shape: 'dot', size: [2.5, 5], g: 0.25, life: [40, 60], colors: ['#efd3cf', '#fffaf2'], down: true },
    };

    function burst(x, y, kind = 'sparkles', count) {
        const cfg = BURSTS[kind] || BURSTS.sparkles;
        let n = count ?? cfg.n;
        if (reduced) n = Math.min(n, 6);
        for (let i = 0; i < n; i++) {
            let angle = Math.random() * Math.PI * 2;
            if (cfg.up) angle = -Math.PI / 2 + rand(-0.9, 0.9);
            if (cfg.down) angle = Math.PI / 2 + rand(-0.7, 0.7);
            const speed = rand(...cfg.speed);
            spawn({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                g: cfg.g,
                drag: cfg.drag ?? 0.975,
                rot: Math.random() * Math.PI,
                vr: rand(-0.12, 0.12),
                size: rand(...cfg.size),
                life: rand(...cfg.life),
                shape: Array.isArray(cfg.shape) ? pick(cfg.shape) : cfg.shape,
                color: pick(cfg.colors),
                flutter: cfg.flutter,
                sway: cfg.sway || 0,
                phase: Math.random() * 6,
                alpha: cfg.alpha
            });
        }
    }

    function burstFrom(el, kind, count) {
        if (!el) return;
        const r = el.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top + r.height / 2, kind, count);
    }

    // Lluvia lenta de pétalos y pan de oro
    function rain(duration = 4500) {
        if (reduced) {
            burst(W / 2, H / 3, 'confetti');
            return;
        }
        const end = performance.now() + duration;
        const drop = () => {
            if (performance.now() > end) return;
            for (let k = 0; k < 3; k++) {
                const petal = Math.random() < 0.5;
                spawn({
                    x: Math.random() * W, y: -20,
                    vx: rand(-0.4, 0.4), vy: rand(1, 2.4),
                    g: 0.012, drag: 1,
                    rot: Math.random() * Math.PI, vr: rand(-0.04, 0.04),
                    size: petal ? rand(5, 9) : rand(4, 7), life: 700,
                    shape: petal ? 'petal' : 'flake',
                    color: petal ? pick(BLUSH) : pick(GOLDS),
                    flutter: true, sway: rand(0.4, 1), phase: Math.random() * 6
                });
            }
            setTimeout(drop, 80);
        };
        drop();
    }

    /* ---------- Avisos y textos flotantes ---------- */

    function toast(message, glyph = '✦', ms = 3600) {
        const wrap = document.getElementById('toasts');
        const el = document.createElement('div');
        el.className = 'toast';
        const icon = document.createElement('span');
        icon.className = 'toast-emoji';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = glyph;
        const text = document.createElement('span');
        text.textContent = message;
        el.append(icon, text);
        wrap.appendChild(el);
        while (wrap.children.length > 3) wrap.firstElementChild.remove();
        setTimeout(() => {
            el.classList.add('out');
            setTimeout(() => el.remove(), 450);
        }, ms);
    }

    function popText(target, text) {
        const r = target.getBoundingClientRect();
        const el = document.createElement('span');
        el.className = 'pop-text';
        el.textContent = text;
        el.style.left = `${r.left + r.width / 2}px`;
        el.style.top = `${r.top - 6}px`;
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1400);
    }

    /* ---------- Secretos (huevos de Pascua) ---------- */

    const EGGS = [
        { id: 'glaseado', name: 'Pan de oro', hint: 'Su nombre todavía no lleva pan de oro…' },
        { id: 'chef', name: 'Oui, Chef', hint: 'Toda chef necesita su gorro. Insiste con la foto.' },
        { id: 'huevo', name: 'Huevo Fabergé', hint: 'Algunos huevos esconden una joya… si insistes.' },
        { id: 'batidor', name: 'A punto de nieve', hint: 'Bate, bate, bate… sin parar.' },
        { id: 'guinda', name: 'La guinda del pastel', hint: 'Lo mejor siempre está arriba del todo.' },
        { id: 'macaron', name: 'Un bocado de más', hint: 'Nadie se resiste a un macaron. Búscalo al final.' },
    ];
    const EGG_KEY = 'yd-huevos';
    const found = new Set(store.get(EGG_KEY, []).filter(id => EGGS.some(e => e.id === id)));

    function findEgg(id, originEl) {
        if (found.has(id)) return false;
        found.add(id);
        store.set(EGG_KEY, [...found]);
        const egg = EGGS.find(e => e.id === id);
        renderEggs(true);
        if (originEl) burstFrom(originEl, 'confetti', 40);
        toast(`Secreto ${found.size} de ${EGGS.length} · ${egg.name}`);
        if (found.size === EGGS.length) {
            setTimeout(() => {
                toast('Seis de seis: ya formas parte del obrador', '❦', 5000);
                rain(5500);
            }, 900);
        }
        return true;
    }

    function renderEggs(bump) {
        const badge = document.getElementById('egg-badge');
        const total = EGGS.length;
        badge.hidden = found.size === 0;
        document.getElementById('egg-badge-count').textContent = `${found.size}/${total}`;
        if (bump) restart(badge, 'bump');

        document.getElementById('egg-count-text').textContent = `${found.size} de ${total}`;
        document.getElementById('egg-meter-fill').style.setProperty('--egg-progress', `${(found.size / total) * 100}%`);
        document.getElementById('egg-secret').hidden = found.size < total;

        const list = document.getElementById('egg-list');
        list.innerHTML = '';
        EGGS.forEach(egg => {
            const isFound = found.has(egg.id);
            const li = document.createElement('li');
            li.className = isFound ? 'found' : '';
            const icon = document.createElement('span');
            icon.className = 'egg-emoji';
            icon.innerHTML = '<svg viewBox="0 0 20 24" aria-hidden="true"><use href="#i-egg-mini" /></svg>';
            const body = document.createElement('span');
            const name = document.createElement('span');
            name.className = 'egg-name';
            name.textContent = isFound ? egg.name : 'Por descubrir';
            const hint = document.createElement('span');
            hint.className = 'egg-hint';
            hint.textContent = isFound ? 'Descubierto' : egg.hint;
            body.append(name, hint);
            li.append(icon, body);
            list.appendChild(li);
        });
    }

    safe('eggs', () => {
        renderEggs(false);
        const modal = document.getElementById('egg-modal');
        document.getElementById('egg-badge').addEventListener('click', () => {
            renderEggs(false);
            openModalEl(modal);
        });
        document.getElementById('egg-reset').addEventListener('click', () => {
            found.clear();
            store.set(EGG_KEY, []);
            renderEggs(false);
            closeModalEl(modal);
            resetEggVisuals();
            toast('Secretos escondidos de nuevo. Suerte en la búsqueda');
        });
    });

    function resetEggVisuals() {
        document.querySelectorAll('#profile-name .ltr.glazed').forEach(l => l.classList.remove('glazed'));
        document.querySelector('.hero-photo-wrap')?.classList.remove('has-toque');
        const egg = document.getElementById('the-egg');
        if (egg) {
            delete egg.dataset.stage;
            egg.setAttribute('aria-label', 'Un huevo… sospechoso');
        }
    }

    /* 1. Pan de oro letra a letra en el nombre */
    safe('glaze', () => {
        const nameEl = document.getElementById('profile-name');
        let celebrated = false;
        const glaze = ltr => {
            if (!ltr) return;
            restart(ltr, 'jelly');
            if (ltr.classList.contains('glazed')) return;
            ltr.classList.add('glazed');
            const letters = [...nameEl.querySelectorAll('.ltr')];
            if (letters.length && letters.every(l => l.classList.contains('glazed'))) {
                letters.forEach((l, i) => setTimeout(() => restart(l, 'jelly'), i * 70));
                burstFrom(nameEl, 'sparkles', 16);
                if (!findEgg('glaseado', nameEl) && !celebrated) popText(nameEl, 'Pan de oro');
                celebrated = true;
            }
        };
        nameEl.addEventListener('pointerover', e => glaze(e.target.closest('.ltr')));
    });

    /* 2. Gorro de chef sobre la foto */
    safe('toque', () => {
        const btn = document.getElementById('photo-btn');
        const wrap = btn.closest('.hero-photo-wrap');
        const replies = ['Hola', '¿Sí?', 'Un poco más…', 'Casi…'];
        let taps = 0;
        let timer;
        btn.addEventListener('click', () => {
            taps++;
            restart(btn, 'squish');
            burstFrom(btn, 'hearts', 5);
            clearTimeout(timer);
            timer = setTimeout(() => { taps = 0; }, 2200);
            if (taps >= 5) {
                taps = 0;
                wrap.classList.add('has-toque');
                popText(btn, 'Oui, Chef');
                findEgg('chef', btn);
            } else if (taps >= 2) {
                popText(btn, replies[taps - 2]);
            }
        });
    });

    /* 3-4. Utensilios: arrastrar, tocar y reaccionar */
    safe('utensils', () => {
        const hero = document.querySelector('.hero');

        if (finePointer && !reduced) {
            hero.addEventListener('pointermove', e => {
                const r = hero.getBoundingClientRect();
                hero.style.setProperty('--px', (((e.clientX - r.left) / r.width) - 0.5) * 2);
                hero.style.setProperty('--py', (((e.clientY - r.top) / r.height) - 0.5) * 2);
            });
            hero.addEventListener('pointerleave', () => {
                hero.style.setProperty('--px', 0);
                hero.style.setProperty('--py', 0);
            });
        }

        let whiskTaps = [];
        const MACARON_COLORS = ['#ecd2d0', '#dfe6d7', '#efe0c4', '#e2dbea', '#f3d9c7'];
        let macaronIdx = 0;

        const ACTIONS = {
            whisk(u, act) {
                const now = Date.now();
                whiskTaps = whiskTaps.filter(t => now - t < 3000);
                whiskTaps.push(now);
                if (whiskTaps.length >= 7) {
                    whiskTaps = [];
                    restart(act, 'spin-fast');
                    burstFrom(u, 'meringue');
                    if (!findEgg('batidor', u)) popText(u, 'A punto de nieve');
                    return;
                }
                restart(act, 'spin');
                if (whiskTaps.length >= 3) popText(u, pick(['Más…', 'Bate, bate…', 'Casi…']));
            },
            'rolling-pin'(u, act) {
                restart(act, 'roll');
                burstFrom(u, 'flour');
            },
            'piping-bag'(u, act) {
                restart(act, 'squeeze');
                const r = u.getBoundingClientRect();
                burst(r.left + r.width / 2, r.bottom - 6, 'frosting');
            },
            spoon(u, act) {
                restart(act, 'stir');
                popText(u, pick(['Mmm…', 'A probar', 'Con calma']));
            },
            egg(u, act) {
                const stage = Number(u.dataset.stage || 0);
                if (stage >= 3) {
                    restart(act, 'jump');
                    burstFrom(u, 'sparkles');
                    popText(u, 'Precioso');
                    return;
                }
                const next = stage + 1;
                u.dataset.stage = String(next);
                restart(act, 'wobble');
                if (next === 3) {
                    u.setAttribute('aria-label', 'Un huevo Fabergé');
                    burstFrom(u, 'sparkles', 14);
                    popText(u, 'Fabergé');
                    findEgg('huevo', u);
                } else {
                    popText(u, next === 1 ? '¿Mm?' : 'Crac…');
                }
            },
            mitt(u, act) {
                restart(act, 'wave');
                popText(u, 'Cuidado, quema');
            },
            cupcake(u, act) {
                restart(act, 'jump');
                burstFrom(u, 'sparkles', 12);
            },
            macaron(u, act) {
                restart(act, 'jump');
                macaronIdx = (macaronIdx + 1) % MACARON_COLORS.length;
                u.style.color = MACARON_COLORS[macaronIdx];
            },
        };

        document.querySelectorAll('.utensil').forEach(u => {
            const act = u.querySelector('.u-act');
            let start = null;
            let base = { x: 0, y: 0 };
            let moved = false;

            u.addEventListener('pointerdown', e => {
                if (e.button !== 0) return;
                delete u.dataset.dragged;
                start = { x: e.clientX, y: e.clientY };
                base = {
                    x: parseFloat(u.style.getPropertyValue('--dx')) || 0,
                    y: parseFloat(u.style.getPropertyValue('--dy')) || 0
                };
                moved = false;
                u.setPointerCapture(e.pointerId);
            });

            u.addEventListener('pointermove', e => {
                if (!start) return;
                const dx = e.clientX - start.x;
                const dy = e.clientY - start.y;
                if (!moved && Math.hypot(dx, dy) < 6) return;
                moved = true;
                u.classList.add('is-dragging');
                u.style.setProperty('--dx', `${base.x + dx}px`);
                u.style.setProperty('--dy', `${base.y + dy}px`);
            });

            const end = () => {
                if (!start) return;
                start = null;
                if (!moved) return;
                u.classList.remove('is-dragging');
                u.dataset.dragged = '1';
                // Que no se escape de la pantalla
                const r = u.getBoundingClientRect();
                let fix = 0;
                if (r.left < 4) fix = 4 - r.left;
                if (r.right > window.innerWidth - 4) fix = window.innerWidth - 4 - r.right;
                if (fix) u.style.setProperty('--dx', `${(parseFloat(u.style.getPropertyValue('--dx')) || 0) + fix}px`);
            };
            u.addEventListener('pointerup', end);
            u.addEventListener('pointercancel', end);

            u.addEventListener('click', () => {
                if (u.dataset.dragged) {
                    delete u.dataset.dragged;
                    return;
                }
                ACTIONS[u.dataset.utensil]?.(u, act);
            });
        });
    });

    /* 5. La guinda del pastel */
    safe('cherry', () => {
        const cherry = document.getElementById('cake-cherry');
        cherry.addEventListener('click', () => {
            restart(cherry, 'jump');
            const cake = document.getElementById('cv-experience');
            if (cake.classList.contains('is-settled')) {
                restart(cake, 'is-dancing');
                setTimeout(() => cake.classList.remove('is-dancing'), 1400);
            }
            setTimeout(() => burstFrom(cherry, 'confetti', 34), 400);
            if (!findEgg('guinda', cherry)) popText(cherry, 'La guinda');
        });
    });

    /* 6. El macaron del pie de página */
    safe('macaron', () => {
        const macaron = document.getElementById('cookie');
        const mask = document.getElementById('cookie-bites');
        const BITES = [[93, 26], [7, 30], [72, 74], [28, 72], [95, 54], [50, 4]];
        const NS = 'http://www.w3.org/2000/svg';
        let bites = 0;

        macaron.addEventListener('click', () => {
            if (macaron.classList.contains('gone')) return;
            const [cx, cy] = BITES[bites % BITES.length];
            [[0, 0, 13], [-8, 6, 7], [7, -7, 7]].forEach(([ox, oy, r]) => {
                const c = document.createElementNS(NS, 'circle');
                c.setAttribute('cx', cx + ox);
                c.setAttribute('cy', cy + oy);
                c.setAttribute('r', r);
                c.setAttribute('fill', '#000');
                c.classList.add('bite');
                mask.appendChild(c);
            });
            bites++;
            restart(macaron, 'chomp');
            burstFrom(macaron, 'crumbs');
            popText(macaron, pick(['Mmm…', 'Delicioso', 'Un bocado más']));

            if (bites >= 5) {
                macaron.classList.add('gone');
                if (!findEgg('macaron', macaron)) toast('Otro macaron, recién hecho');
                setTimeout(() => {
                    mask.querySelectorAll('.bite').forEach(b => b.remove());
                    bites = 0;
                    macaron.classList.remove('gone');
                    restart(macaron, 'respawn');
                }, 2600);
            }
        });
    });

    /* Extra para teclados: código Konami */
    safe('konami', () => {
        const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
        let pos = 0;
        document.addEventListener('keydown', e => {
            const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
            pos = key === KONAMI[pos] ? pos + 1 : (key === KONAMI[0] ? 1 : 0);
            if (pos === KONAMI.length) {
                pos = 0;
                document.body.classList.add('party');
                rain(6000);
                toast('Modo celebración', '❦');
                setTimeout(() => document.body.classList.remove('party'), 6500);
            }
        });
    });

    /* Destellos dorados al hacer clic */
    safe('click-sparkles', () => {
        document.addEventListener('click', e => {
            if (e.detail === 0) return; // clic de teclado
            if (e.target.closest('input, textarea, select, label, .admin-panel, .utensil, #cookie, #photo-btn, #cake-cherry')) return;
            burst(e.clientX, e.clientY, 'sparkles', 6);
        });
    });

    /* Ingredientes: tachar la receta */
    safe('ingredients', () => {
        const list = document.getElementById('cv-specialties');
        list.addEventListener('change', e => {
            if (e.target.checked) burstFrom(e.target, 'sparkles', 8);
            const boxes = [...list.querySelectorAll('input[type="checkbox"]')];
            if (e.target.checked && boxes.length && boxes.every(b => b.checked)) {
                toast('Receta completa. Solo falta el horno');
            }
        });
    });

    /* Inclinación 3D sutil de las tarjetas */
    safe('tilt', () => {
        if (!finePointer || reduced) return;
        const grid = document.getElementById('dessert-grid');
        grid.addEventListener('pointermove', e => {
            const card = e.target.closest('.dessert-card');
            if (!card) return;
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            card.classList.add('is-tilting');
            card.style.setProperty('--ry', `${(px - 0.5) * 7}deg`);
            card.style.setProperty('--rx', `${(0.5 - py) * 6}deg`);
            card.style.setProperty('--mx', `${px * 100}%`);
            card.style.setProperty('--my', `${py * 100}%`);
        });
        grid.addEventListener('pointerout', e => {
            const card = e.target.closest('.dessert-card');
            if (!card || card.contains(e.relatedTarget)) return;
            card.classList.remove('is-tilting');
            card.style.removeProperty('--rx');
            card.style.removeProperty('--ry');
        });
    });

    /* Barra de progreso y botón de volver arriba */
    safe('scroll', () => {
        const bar = document.querySelector('.nav-progress span');
        const toTop = document.getElementById('to-top');
        let ticking = false;
        const update = () => {
            ticking = false;
            const max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.setProperty('--progress', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
            toTop.classList.toggle('is-visible', window.scrollY > 700);
        };
        window.addEventListener('scroll', () => {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }, { passive: true });
        update();

        toTop.addEventListener('click', () => {
            if (toTop.classList.contains('is-launching')) return;
            toTop.classList.add('is-launching');
            burstFrom(toTop, 'sparkles', 10);
            window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
            setTimeout(() => toTop.classList.remove('is-launching'), 1000);
        });
    });

    /* Título de la pestaña cuando te vas */
    safe('title', () => {
        const original = document.title;
        document.addEventListener('visibilitychange', () => {
            document.title = document.hidden ? 'Vuelve… te guardo un trozo ✦' : original;
        });
    });

    /* ---------- Diseñador de tartas ---------- */

    const OPTIONS = {
        sponge: [
            { id: 'vainilla', label: 'Vainilla', c: '#f1dfb4' },
            { id: 'chocolate', label: 'Chocolate', c: '#6d4434' },
            { id: 'red-velvet', label: 'Red velvet', c: '#9e3a43' },
            { id: 'naranja', label: 'Naranja', c: '#e8b06f' },
            { id: 'te-verde', label: 'Té verde', c: '#b3c49a' },
        ],
        filling: [
            { id: 'dulce-de-leche', label: 'Dulce de leche', c: '#c08a52' },
            { id: 'ganache', label: 'Ganache', c: '#4a2c22' },
            { id: 'frutos-del-bosque', label: 'Frutos del bosque', c: '#8a3a5c' },
            { id: 'crema-pastelera', label: 'Crema pastelera', c: '#efd78e' },
            { id: 'maracuya', label: 'Maracuyá', c: '#e3b649' },
        ],
        topping: [
            { id: 'buttercream', label: 'Buttercream rosa', c: '#f2d6d4' },
            { id: 'merengue', label: 'Merengue', c: '#fffaf2' },
            { id: 'espejo', label: 'Glaseado espejo', c: '#3a2420' },
            { id: 'fondant', label: 'Fondant salvia', c: '#dfe7d8' },
        ],
        decor: [
            { id: 'flores', label: 'Flores de azúcar', c: '#f3d9da' },
            { id: 'oro', label: 'Pan de oro', c: 'linear-gradient(135deg, #f1dfae, #b98d52)' },
            { id: 'fresas', label: 'Fresas', c: '#a8323b' },
            { id: 'virutas', label: 'Virutas de chocolate', c: '#5a3a2c' },
            { id: 'velas', label: 'Velas', c: '#fffaf2' },
        ],
    };

    const TIER_SHAPES = {
        1: [{ w: 210, h: 108 }],
        2: [{ w: 224, h: 80 }, { w: 156, h: 66 }],
        3: [{ w: 236, h: 66 }, { w: 174, h: 56 }, { w: 116, h: 48 }],
    };

    const tierCount = people => (people <= 14 ? 1 : people <= 32 ? 2 : 3);
    const option = (group, id) => OPTIONS[group].find(o => o.id === id);

    function seeded(seed) {
        return () => {
            seed = (seed + 0x6D2B79F5) | 0;
            let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    function toppingPath(x, y, w, band, style, seed) {
        let d = `M${x} ${y + band} V${y + 7} Q${x} ${y} ${x + 7} ${y} H${x + w - 7} Q${x + w} ${y} ${x + w} ${y + 7} V${y + band}`;
        if (style === 'scallop') {
            const n = Math.max(4, Math.round(w / 20));
            const seg = w / n;
            for (let i = n - 1; i >= 0; i--) {
                d += ` A${(seg / 2).toFixed(1)} ${(seg / 2.8).toFixed(1)} 0 0 1 ${(x + i * seg).toFixed(1)} ${y + band}`;
            }
            return d + 'Z';
        }
        if (style === 'flat') return d + 'Z';
        const r = seeded(seed);
        const n = Math.max(5, Math.round(w / 18));
        const seg = w / n;
        for (let i = n - 1; i >= 0; i--) {
            const cx = x + i * seg + seg / 2;
            const dw = seg * 0.34;
            const len = band * (0.15 + r() * 0.7);
            d += ` L${(cx + dw / 2).toFixed(1)} ${y + band}`;
            d += ` V${(y + band + len - dw / 2).toFixed(1)}`;
            d += ` A${(dw / 2).toFixed(1)} ${(dw / 2).toFixed(1)} 0 0 1 ${(cx - dw / 2).toFixed(1)} ${(y + band + len - dw / 2).toFixed(1)}`;
            d += ` V${y + band} L${(x + i * seg).toFixed(1)} ${y + band}`;
        }
        return d + 'Z';
    }

    function flower(cx, cy, color) {
        let s = `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})">`;
        for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
            s += `<ellipse cx="${(Math.cos(a) * 4.4).toFixed(1)}" cy="${(Math.sin(a) * 4.4).toFixed(1)}" rx="3.9" ry="3.2" transform="rotate(${(a * 180 / Math.PI + 90).toFixed(0)} ${(Math.cos(a) * 4.4).toFixed(1)} ${(Math.sin(a) * 4.4).toFixed(1)})" fill="${color}" stroke="${GOLD_LINE}" stroke-width=".7"/>`;
        }
        return s + `<circle r="2.2" fill="#e3c98f" stroke="${GOLD_LINE}" stroke-width=".7"/></g>`;
    }

    function strawberry(cx, cy) {
        return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})">
            <path d="M-8 -4C-8 -9 8 -9 8 -4C8 3 3 9 0 11C-3 9 -8 3 -8 -4Z" fill="#a8323b" stroke="#7a1f28" stroke-width="1" stroke-linejoin="round"/>
            <path d="M-6 -6.5L-2.5 -10.5L0 -7.5L2.5 -10.5L6 -6.5Z" fill="#c9d6bf" stroke="${GOLD_LINE}" stroke-width=".8" stroke-linejoin="round"/>
            <circle cx="-3" cy="-1" r=".8" fill="#f1dfae"/><circle cx="3" cy="2" r=".8" fill="#f1dfae"/><circle cx="0" cy="6" r=".8" fill="#f1dfae"/>
        </g>`;
    }

    function candle(cx, top) {
        return `<g>
            <rect x="${cx - 2.5}" y="${top - 30}" width="5" height="30" rx="1.5" fill="#fffaf2" stroke="${GOLD_LINE}" stroke-width="1"/>
            <path d="M${cx - 2.5} ${top - 21}l5 -3M${cx - 2.5} ${top - 11}l5 -3" stroke="${GOLD_LINE}" stroke-width=".8"/>
            <path class="flame" d="M${cx} ${top - 45}q6 8 0 12q-6 -4 0 -12Z" fill="#f3c66b" stroke="#c9a46c" stroke-width=".8" stroke-linejoin="round"/>
        </g>`;
    }

    function goldFlake(px, py, r) {
        const s = 2.5 + r() * 2.5;
        const a = r() * Math.PI;
        const pts = [[-s, -s * 0.4], [s * 0.6, -s * 0.75], [s, s * 0.3], [-s * 0.3, s * 0.7]]
            .map(([x, y]) => `${(px + x * Math.cos(a) - y * Math.sin(a)).toFixed(1)},${(py + x * Math.sin(a) + y * Math.cos(a)).toFixed(1)}`)
            .join(' ');
        return `<polygon points="${pts}" fill="url(#gold-leaf)" stroke="${GOLD_LINE}" stroke-width=".5"/>`;
    }

    function cakeSVG(state) {
        const sponge = option('sponge', state.sponge).c;
        const filling = option('filling', state.filling).c;
        const topping = option('topping', state.topping);
        const tiers = TIER_SHAPES[tierCount(state.people)];
        let out = `<defs><linearGradient id="gold-leaf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1dfae"/><stop offset="1" stop-color="#b98d52"/></linearGradient></defs>`;
        // Pie de tarta
        out += `<path d="M130 266h40l-4 11c14 2 22 5 26 9H108c4-4 12-7 26-9Z" fill="#fffdf9" stroke="${GOLD_LINE}" stroke-width="1.1" stroke-linejoin="round"/>`;
        out += `<ellipse cx="150" cy="262" rx="136" ry="7" fill="#fffdf9" stroke="${GOLD_LINE}" stroke-width="1.1"/>`;
        let base = 258;
        let top = null;

        tiers.forEach((t, i) => {
            const x = 150 - t.w / 2;
            const y = base - t.h;
            const band = Math.round(t.h * 0.26);
            const r = seeded(i * 97 + 11);
            let g = `<g class="tier" style="animation-delay:${i * 80}ms">`;
            g += `<clipPath id="tier-clip-${i}"><rect x="${x}" y="${y}" width="${t.w}" height="${t.h}" rx="6"/></clipPath>`;
            g += `<g clip-path="url(#tier-clip-${i})"><rect x="${x}" y="${y}" width="${t.w}" height="${t.h}" fill="${sponge}"/>`;
            [0.47, 0.74].forEach(f => {
                g += `<rect x="${x}" y="${(y + t.h * f).toFixed(1)}" width="${t.w}" height="${Math.max(5, t.h * 0.09).toFixed(1)}" fill="${filling}"/>`;
            });
            g += `</g><rect x="${x}" y="${y}" width="${t.w}" height="${t.h}" rx="6" fill="none" stroke="${LINE}" stroke-width="1.2"/>`;

            if (topping.id === 'fondant') {
                g += `<path d="${toppingPath(x, y, t.w, band, 'flat')}" fill="${topping.c}" stroke="${LINE}" stroke-width="1.1" stroke-linejoin="round"/>`;
                for (let px = x + 6; px <= x + t.w - 5; px += 8) {
                    g += `<circle cx="${px.toFixed(1)}" cy="${y + band}" r="2.8" fill="#fffdf9" stroke="${GOLD_LINE}" stroke-width=".8"/>`;
                }
            } else {
                const style = topping.id === 'merengue' ? 'scallop' : 'drip';
                g += `<path d="${toppingPath(x, y, t.w, band, style, i * 31 + 5)}" fill="${topping.c}" stroke="${LINE}" stroke-width="1.1" stroke-linejoin="round"/>`;
                if (topping.id === 'espejo') {
                    g += `<path d="M${x + 12} ${y + 5}H${x + t.w * 0.42}" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".45"/>`;
                }
                if (topping.id === 'merengue') {
                    for (let px = x + 12; px <= x + t.w - 11; px += 16) {
                        g += `<path d="M${px.toFixed(1)} ${y + 2}q-6 0 -6 -5q0 -5 6 -10q6 5 6 10q0 5 -6 5Z" fill="${topping.c}" stroke="${LINE}" stroke-width=".9" stroke-linejoin="round"/>`;
                    }
                }
            }

            if (state.decor.has('oro')) {
                for (let k = 0; k < Math.round(t.w / 26); k++) {
                    g += goldFlake(x + 10 + r() * (t.w - 20), y + band + 8 + r() * (t.h - band - 14), r);
                }
            }
            if (state.decor.has('flores')) {
                const n = Math.max(2, Math.round(t.w / 64));
                for (let k = 0; k < n; k++) {
                    g += flower(x + (t.w / (n + 1)) * (k + 1), y + t.h * 0.62 + (k % 2 ? -5 : 5), k % 2 ? '#fffaf2' : '#f3d9da');
                }
            }
            g += '</g>';
            out += g;
            top = { x, y, w: t.w };
            base = y + 1;
        });

        // Decoración sobre el piso superior
        const cx = top.x + top.w / 2;
        if (state.decor.has('virutas')) {
            for (let k = 0; k < 6; k++) {
                const px = top.x + 14 + (k * (top.w - 28)) / 5;
                out += `<path d="M${px.toFixed(1)} ${top.y + 3}q3 -6 6 -2" fill="none" stroke="#5a3a2c" stroke-width="2" stroke-linecap="round"/>`;
            }
        }
        const candles = state.decor.has('velas');
        if (state.decor.has('fresas')) {
            const spots = candles ? [0.2, 0.8] : [0.28, 0.5, 0.72];
            spots.forEach(s => { out += strawberry(top.x + top.w * s, top.y - 5); });
        }
        if (candles) {
            [-14, 0, 14].forEach(off => { out += candle(cx + off, top.y + 1); });
        }
        if (state.decor.has('flores') && !candles && !state.decor.has('fresas')) {
            out += flower(cx - 9, top.y - 4, '#f3d9da') + flower(cx + 8, top.y - 6, '#fffaf2');
        }
        return out;
    }

    safe('builder', () => {
        const preview = document.getElementById('cake-preview');
        const range = document.getElementById('b-people');
        const output = document.getElementById('b-people-out');
        const state = {
            people: Number(range.value),
            sponge: 'chocolate',
            filling: 'frutos-del-bosque',
            topping: 'buttercream',
            decor: new Set(['flores', 'oro'])
        };

        Object.entries(OPTIONS).forEach(([group, opts]) => {
            const wrap = document.querySelector(`.swatches[data-group="${group}"]`);
            const multi = group === 'decor';
            wrap.innerHTML = opts.map(o => {
                const checked = multi ? state.decor.has(o.id) : state[group] === o.id;
                return `<label class="swatch"><input type="${multi ? 'checkbox' : 'radio'}" name="b-${group}" value="${o.id}"${checked ? ' checked' : ''}><span style="--c:${o.c}">${o.label}</span></label>`;
            }).join('');
        });

        let lastTiers = tierCount(state.people);
        const draw = bounce => {
            preview.innerHTML = cakeSVG(state);
            if (bounce && !reduced) restart(preview, 'bounce');
        };
        const syncRange = () => {
            const pct = ((state.people - range.min) / (range.max - range.min)) * 100;
            range.style.setProperty('--fill', `${pct}%`);
            output.textContent = state.people;
        };

        range.addEventListener('input', () => {
            state.people = Number(range.value);
            syncRange();
            const tiers = tierCount(state.people);
            if (tiers !== lastTiers) {
                lastTiers = tiers;
                draw(true);
                burstFrom(preview, 'sparkles', 10);
            }
        });

        document.querySelector('.builder-controls').addEventListener('change', e => {
            const input = e.target;
            if (!input.name || !input.name.startsWith('b-')) return;
            const group = input.name.slice(2);
            if (group === 'decor') {
                if (input.checked) state.decor.add(input.value);
                else state.decor.delete(input.value);
            } else {
                state[group] = input.value;
            }
            draw(true);
        });

        // Soplar las velas
        preview.addEventListener('click', e => {
            const flame = e.target.closest('.flame');
            if (!flame || flame.classList.contains('out')) return;
            flame.classList.add('out');
            const r = flame.getBoundingClientRect();
            burst(r.left + r.width / 2, r.top, 'meringue', 4);
            if (![...preview.querySelectorAll('.flame')].some(f => !f.classList.contains('out'))) {
                toast('Pide un deseo');
            }
        });

        const listJoin = items => items.length > 1 ? `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}` : (items[0] || '');

        document.getElementById('btn-builder-apply').addEventListener('click', e => {
            const tiers = tierCount(state.people);
            const label = (group, id) => option(group, id).label.toLowerCase();
            const decor = OPTIONS.decor.filter(o => state.decor.has(o.id)).map(o => o.label.toLowerCase());
            const summary = `${tiers} ${tiers > 1 ? 'pisos' : 'piso'} para unas ${state.people} personas. Bizcocho de ${label('sponge', state.sponge)}, relleno de ${label('filling', state.filling)} y cobertura de ${label('topping', state.topping)}${decor.length ? `. Decoración: ${listJoin(decor)}` : ''}.`;

            document.getElementById('f-design').value = summary;

            const subject = document.getElementById('subject');
            if (!subject.value.trim() || subject.value.startsWith('Tarta personalizada')) {
                subject.value = `Tarta personalizada (${state.people} personas)`;
            }

            const message = document.getElementById('message');
            const line = `Mi tarta soñada: ${summary}`;
            const previous = /^Mi tarta soñada:.*$/m;
            if (previous.test(message.value)) message.value = message.value.replace(previous, line);
            else message.value = message.value.trim() ? `${line}\n\n${message.value}` : `${line}\n`;

            burstFrom(e.currentTarget, 'confetti', 30);
            toast('Diseño añadido a tu encargo');
            if (window.innerWidth <= 920) {
                document.getElementById('ticket').scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
            }
        });

        syncRange();
        draw(false);
    });

    /* ---------- Carta de encargo: envío con sello de lacre ---------- */

    safe('order-form', () => {
        const form = document.getElementById('contact-form');
        const done = document.getElementById('ticket-done');
        const btn = document.getElementById('btn-send');
        const label = btn.querySelector('.btn-send-label');
        const status = document.getElementById('form-status');
        const idleLabel = label.textContent;

        const newTicket = () => {
            document.getElementById('ticket-no').textContent = String(Math.floor(1000 + Math.random() * 9000));
            document.getElementById('ticket-date').textContent = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.');
        };
        newTicket();

        form.addEventListener('submit', async e => {
            e.preventDefault();
            btn.classList.add('is-baking');
            btn.disabled = true;
            label.textContent = 'Enviando tu encargo…';
            status.textContent = '';
            status.className = 'form-status';

            try {
                // Solo los campos rellenos, para que el email llegue limpio
                const fields = [...new FormData(form)].filter(([, value]) => String(value).trim() !== '');
                const payload = JSON.stringify(Object.fromEntries(fields));
                const res = await fetch(form.action, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
                    body: payload
                });
                const json = await res.json().catch(() => ({}));
                if (!res.ok || !json.success) throw new Error(json.message || `HTTP ${res.status}`);

                form.reset();
                form.hidden = true;
                done.hidden = false;
                setTimeout(() => burstFrom(done.querySelector('.wax-seal'), 'confetti', 40), 450);
                toast('Encargo enviado');
            } catch (err) {
                console.error(err);
                status.textContent = 'No hemos podido enviar tu encargo. Inténtalo de nuevo o escríbeme por email.';
                status.classList.add('error');
            } finally {
                btn.classList.remove('is-baking');
                btn.disabled = false;
                label.textContent = idleLabel;
            }
        });

        document.getElementById('btn-new-order').addEventListener('click', () => {
            done.hidden = true;
            form.hidden = false;
            if (typeof renderAntojos === 'function') renderAntojos();
            newTicket();
            document.getElementById('name').focus();
        });
    });

    /* Mensaje para quien abra la consola */
    console.log('%cYuliana Díaz · Pastelería', 'font: italic 600 22px "Cormorant Garamond", Georgia, serif; color: #8c6a3f');
    console.log('%cEsta web guarda seis secretos dulces… y uno más para teclados: ↑ ↑ ↓ ↓ ← → ← → B A', 'font: 13px sans-serif; color: #6b5a52');

    window.Fun = { burst, burstFrom, rain, toast, popText, findEgg };
})();
