let portfolioData = { profile: {}, desserts: [] };

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const esc = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[c]));

// Efectos opcionales (fun.js). Si no está cargado, todo sigue funcionando.
const fx = () => window.Fun || null;

const LAYER_COLORS = ['#f6e4e1', '#f3eadb', '#e7ede1', '#ece6f0', '#f6e9dc'];
const GREETINGS = {
    'español': '¡Hola!', 'inglés': 'Hello!', 'ingles': 'Hello!', 'francés': 'Bonjour!', 'frances': 'Bonjour!',
    'italiano': 'Ciao!', 'portugués': 'Olá!', 'portugues': 'Olá!', 'alemán': 'Hallo!', 'aleman': 'Hallo!', 'catalán': 'Bon dia!'
};

const AUTHOR_RE = /propia|autor/i;
const SUGAR_ART_RE = /t[ée]cnica|decorativ|fondant|az[uú]car/i;
const FILTERS = [
    { id: 'all', label: 'Todos', test: () => true },
    { id: 'autor', label: 'De autor', test: d => AUTHOR_RE.test(d.origin || '') },
    { id: 'mundo', label: 'Vuelta al mundo', test: d => !AUTHOR_RE.test(d.origin || '') && !SUGAR_ART_RE.test(d.origin || '') },
    { id: 'arte', label: 'Arte en azúcar', test: d => SUGAR_ART_RE.test(d.origin || '') },
];

let activeFilter = 'all';
let visibleDesserts = [];
let modalIndex = -1;
let surpriseTimer = null;
let lastFocus = null;

document.addEventListener('DOMContentLoaded', async () => {
    setupReveal();
    await loadData();
    checkAdminMode();
    setupEventListeners();
});

async function loadData() {
    try {
        const response = await fetch('data.json?t=' + new Date().getTime()); // Prevent caching
        if (response.ok) {
            portfolioData = await response.json();
            renderProfile();
            renderDesserts();
            renderAntojos();
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function getDessert(id) {
    return (portfolioData.desserts || []).find(d => d.id === id);
}

function instagramUrl(handle) {
    return handle.includes('http') ? handle : 'https://www.instagram.com/' + handle.replace('@', '');
}

// ---------- Perfil ----------

function renderProfile() {
    const profile = portfolioData.profile;
    renderName(profile.name || 'Chef Pastelera');
    document.getElementById('profile-bio').textContent = profile.bio || '';

    const contactBtn = document.getElementById('profile-contact');
    if (profile.contact) {
        contactBtn.href = `mailto:${profile.contact}`;
        document.getElementById('profile-contact-text').textContent = profile.contact;
        contactBtn.style.display = 'inline-flex';
    } else {
        contactBtn.style.display = 'none';
    }

    const phoneEl = document.getElementById('profile-phone');
    if (profile.phone) {
        document.getElementById('profile-phone-text').textContent = profile.phone;
        phoneEl.style.display = 'inline-flex';
    } else {
        phoneEl.style.display = 'none';
    }

    const profileIG = document.getElementById('profile-ig');
    if (profile.instagram) {
        const igUrl = instagramUrl(profile.instagram);
        profileIG.href = igUrl;
        document.getElementById('profile-ig-text').textContent = '@' + igUrl.split('/').filter(Boolean).pop();
        profileIG.style.display = 'inline-flex';
    } else {
        profileIG.style.display = 'none';
    }

    const profileImg = document.getElementById('profile-img');
    if (profile.image) {
        profileImg.src = profile.image;
        profileImg.alt = profile.name ? `Foto de ${profile.name}` : 'Foto de perfil';
        profileImg.classList.remove('hidden');
    } else {
        profileImg.classList.add('hidden');
    }

    // Render CV section
    const cvSection = document.getElementById('cv-section');
    if (profile.experience || profile.titles) {
        cvSection.classList.remove('hidden');

        renderCake(Array.isArray(profile.experience) ? profile.experience : []);

        const titlesContainer = document.getElementById('cv-titles');
        titlesContainer.innerHTML = (Array.isArray(profile.titles) ? profile.titles : []).map(title => `
            <div class="diploma">
                <svg viewBox="0 0 60 80" aria-hidden="true"><use href="#i-seal" /></svg>
                <div>
                    <p class="title-name">${esc(title.name)}${title.period ? ` <span class="title-period">${esc(title.period)}</span>` : ''}</p>
                    <p class="title-institution">${esc(title.institution)}</p>
                </div>
            </div>
        `).join('');

        const specContainer = document.getElementById('cv-specialties');
        specContainer.innerHTML = (Array.isArray(profile.specialties) ? profile.specialties : []).map(spec => {
            const [head, ...rest] = spec.split(/\s+—\s+/);
            return `
                <li class="ingredient">
                    <label><input type="checkbox"><span><strong>${esc(head)}</strong>${rest.length ? ' — ' + esc(rest.join(' — ')) : ''}</span></label>
                </li>`;
        }).join('');

        const langContainer = document.getElementById('cv-languages');
        langContainer.innerHTML = (Array.isArray(profile.languages) ? profile.languages : []).map(lang => `
            <div class="bubble">
                <span class="bubble-greet">${esc(GREETINGS[(lang.lang || '').toLowerCase()] || '¡Hey!')}</span>
                <span class="bubble-lang">${esc(lang.lang)}</span>
                <span class="bubble-level">· ${esc(lang.level)}</span>
            </div>
        `).join('');
    } else {
        cvSection.classList.add('hidden');
    }

    // Render Footer
    document.getElementById('footer-year').textContent = new Date().getFullYear();
    document.getElementById('footer-name').textContent = profile.name || '';

    if (profile.contact) {
        document.getElementById('footer-email').href = 'mailto:' + profile.contact;
        document.getElementById('footer-email-text').textContent = profile.contact;
    }

    const footerPhone = document.getElementById('footer-phone-link');
    if (profile.phone) {
        footerPhone.href = 'tel:' + profile.phone.replace(/\s/g, '');
        document.getElementById('footer-phone-text').textContent = profile.phone;
        footerPhone.style.display = 'flex';
    }

    const footerIG = document.getElementById('footer-instagram');
    if (profile.instagram) {
        const igUrl = instagramUrl(profile.instagram);
        footerIG.href = igUrl;
        footerIG.querySelector('span').textContent = '@' + igUrl.split('/').filter(Boolean).pop();
        footerIG.style.display = 'flex';
    }
}

// Cada letra del nombre es una pieza que se puede "glasear" (ver fun.js)
function renderName(name) {
    const h1 = document.getElementById('profile-name');
    h1.setAttribute('aria-label', name);
    h1.innerHTML = name.split(/\s+/).map(word =>
        `<span class="word" style="white-space:nowrap">${[...word].map(ch => `<span class="ltr" aria-hidden="true">${esc(ch)}</span>`).join('')}</span>`
    ).join(' ');
}

function formatDuty(duty) {
    const match = duty.match(/^([^:]{2,60}):\s*(.*)$/);
    return match ? `<strong>${esc(match[1])}:</strong> ${esc(match[2])}` : esc(duty);
}

// La experiencia se dibuja como una tarta: la capa de arriba es la más reciente
function renderCake(experience) {
    const cake = document.getElementById('cv-experience');
    const n = experience.length;
    cake.classList.remove('is-built', 'is-settled');
    cake.innerHTML = experience.map((job, i) => {
        const isPresent = /presente|actual/i.test(job.period || '');
        const duties = (job.duties || []).map(d => `<li>${formatDuty(d)}</li>`).join('');
        const open = i === 0;
        return `
            <div class="cake-layer${i === 0 ? ' is-top' : ''}${open ? ' is-open' : ''}"
                style="--tier:${n - 1 - i};--rev:${n - 1 - i};--i:${i};--layer:${LAYER_COLORS[i % LAYER_COLORS.length]}">
                <button type="button" class="layer-head" aria-expanded="${open}" aria-controls="layer-body-${i}">
                    <span class="layer-text">
                        <span class="layer-tags">
                            <span class="layer-period">${esc(job.period)}</span>
                            ${isPresent ? '<span class="layer-oven">En el horno</span>' : ''}
                        </span>
                        <span class="layer-role">${esc(job.role)}</span>
                        <span class="layer-meta">${esc([job.company, job.country].filter(Boolean).join(' · '))}</span>
                    </span>
                    <span class="layer-toggle" aria-hidden="true">+</span>
                </button>
                <div class="layer-body" id="layer-body-${i}"><div><ul class="exp-duties">${duties}</ul></div></div>
            </div>`;
    }).join('');
    observeCake();
}

// ---------- Vitrina ----------

function renderDesserts() {
    const grid = document.getElementById('dessert-grid');

    // Sort desserts newest first
    const desserts = [...(portfolioData.desserts || [])].reverse();

    grid.innerHTML = desserts.map(dessert => `
        <article class="dessert-card" data-id="${esc(dessert.id)}" data-reveal>
            <button type="button" class="card-hit" aria-label="Ver ${esc(dessert.name)}"></button>
            <div class="admin-actions no-print">
                <button type="button" class="btn btn-secondary btn-sm" data-action="edit">Editar</button>
                <button type="button" class="btn btn-danger btn-sm" data-action="delete">Eliminar</button>
            </div>
            <button type="button" class="fav-btn" data-action="fav" aria-pressed="${isFav(dessert.id)}"
                aria-label="Marcar ${esc(dessert.name)} como antojo">
                <svg width="22" height="22" aria-hidden="true"><use href="#i-heart" /></svg>
            </button>
            <div class="card-image-wrapper">
                <img src="${esc(dessert.mainImage)}" alt="${esc(dessert.name)}" class="card-image" loading="lazy">
                ${dessert.origin ? `<span class="card-stamp">${esc(dessert.origin)}</span>` : ''}
            </div>
            <div class="card-content">
                <h3 class="card-title">${esc(dessert.name)}</h3>
                ${dessert.description ? `<p class="card-desc">${esc(dessert.description)}</p>` : ''}
            </div>
        </article>
    `).join('') || '<p class="empty-plate">La vitrina está vacía… algo se está horneando.</p>';

    renderChips();
    applyFilter(activeFilter, false);
    observeReveals(grid);
}

function renderChips() {
    const desserts = portfolioData.desserts || [];
    document.getElementById('origin-chips').innerHTML = FILTERS.map(f => {
        const count = desserts.filter(f.test).length;
        if (!count) return '';
        return `<button type="button" class="chip" data-filter="${f.id}" aria-pressed="${f.id === activeFilter}">${f.label}<span class="chip-count">${count}</span></button>`;
    }).join('');
}

function applyFilter(filterId, animate) {
    const filter = FILTERS.find(f => f.id === filterId) || FILTERS[0];
    activeFilter = filter.id;

    document.querySelectorAll('#origin-chips .chip').forEach(chip => {
        chip.setAttribute('aria-pressed', String(chip.dataset.filter === activeFilter));
    });

    visibleDesserts = [];
    const shownCards = [];
    document.querySelectorAll('#dessert-grid .dessert-card').forEach(card => {
        const dessert = getDessert(card.dataset.id);
        const match = Boolean(dessert && filter.test(dessert));
        card.hidden = !match;
        if (match) {
            visibleDesserts.push(dessert);
            shownCards.push(card);
        }
    });

    if (animate) {
        shownCards.forEach((card, i) => {
            card.classList.remove('is-visible');
            card.style.setProperty('--delay', `${Math.min(i, 9) * 45}ms`);
        });
        requestAnimationFrame(() => requestAnimationFrame(() => {
            shownCards.forEach(card => card.classList.add('is-visible'));
        }));
    }
}

// ---------- Antojos (favoritos) ----------

const FAV_KEY = 'yd-antojos';
let favorites = loadFavorites();

function loadFavorites() {
    try {
        const stored = JSON.parse(localStorage.getItem(FAV_KEY));
        return Array.isArray(stored) ? stored : [];
    } catch {
        return [];
    }
}

function saveFavorites() {
    try { localStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch { /* sin almacenamiento */ }
}

function isFav(id) {
    return favorites.includes(id);
}

function setFav(id, on, sourceEl) {
    if (on === isFav(id)) return;
    favorites = on ? [...favorites, id] : favorites.filter(f => f !== id);
    saveFavorites();

    document.querySelectorAll(`.dessert-card[data-id="${CSS.escape(id)}"] .fav-btn`).forEach(btn => {
        btn.setAttribute('aria-pressed', String(on));
        btn.classList.remove('pop');
        void btn.offsetWidth;
        if (on) btn.classList.add('pop');
    });
    syncModalFav();
    renderAntojos();

    if (on && sourceEl) {
        fx()?.burstFrom(sourceEl, 'hearts');
        fx()?.popText(sourceEl, 'Mmm…');
    }
}

function renderAntojos() {
    const favs = favorites.map(getDessert).filter(Boolean);
    document.getElementById('antojos-box').classList.toggle('hidden', !favs.length);
    document.getElementById('antojos-list').innerHTML = favs.map(d =>
        `<span class="antojo">${esc(d.name)}<button type="button" data-unfav="${esc(d.id)}" aria-label="Quitar ${esc(d.name)}">×</button></span>`
    ).join('');
    document.getElementById('f-antojos').value = favs.map(d => d.name).join(', ');
}

// ---------- Modal ----------

const modal = document.getElementById('dessert-modal');

function modalList() {
    return visibleDesserts.length ? visibleDesserts : (portfolioData.desserts || []);
}

function showDessert(dessert, animate) {
    const mainImg = document.getElementById('modal-main-img');
    mainImg.src = dessert.mainImage;
    mainImg.alt = dessert.name;
    if (animate) {
        mainImg.classList.remove('swap');
        void mainImg.offsetWidth;
        mainImg.classList.add('swap');
    }
    document.getElementById('modal-name').textContent = dessert.name;
    document.getElementById('modal-origin').textContent = dessert.origin || '';

    const descEl = document.getElementById('modal-desc');
    if (dessert.description) {
        descEl.textContent = dessert.description;
        descEl.style.display = 'block';
    } else {
        descEl.style.display = 'none';
    }

    const secGallery = document.getElementById('modal-sec-imgs');
    secGallery.innerHTML = '';

    if (dessert.secondaryImages && dessert.secondaryImages.length > 0) {
        dessert.secondaryImages.forEach(imgUrl => {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.alt = `${dessert.name} (otra vista)`;
            img.onclick = () => {
                // Swap main image
                const mainSrc = mainImg.src;
                mainImg.src = img.src;
                img.src = mainSrc;
                mainImg.classList.remove('swap');
                void mainImg.offsetWidth;
                mainImg.classList.add('swap');
            };
            secGallery.appendChild(img);
        });
    }

    const list = modalList();
    document.getElementById('modal-count').textContent = `${modalIndex + 1} / ${list.length}`;
    syncModalFav();
}

function syncModalFav() {
    const dessert = modalList()[modalIndex];
    const btn = document.getElementById('modal-fav');
    const on = Boolean(dessert && isFav(dessert.id));
    btn.setAttribute('aria-pressed', String(on));
    btn.querySelector('span').textContent = on ? '¡Antojo!' : 'Antojo';
}

function openModalEl(el) {
    if (!el.classList.contains('active')) lastFocus = document.activeElement;
    el.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    el.querySelector('.close-modal')?.focus({ preventScroll: true });
}

function closeModalEl(el) {
    el.classList.remove('active');
    if (el === modal) stopSurprise();
    if (!document.querySelector('.modal.active')) document.body.style.overflow = '';
    lastFocus?.focus?.({ preventScroll: true });
}

function openModal(dessert) {
    const list = modalList();
    modalIndex = Math.max(0, list.findIndex(d => d.id === dessert.id));
    stopSurprise();
    showDessert(dessert, false);
    openModalEl(modal);
}

function stepModal(delta) {
    const list = modalList();
    if (!list.length || modal.classList.contains('is-surprise')) return;
    modalIndex = (modalIndex + delta + list.length) % list.length;
    showDessert(list[modalIndex], true);
}

function stopSurprise() {
    clearTimeout(surpriseTimer);
    modal.classList.remove('is-surprise', 'is-revealed');
}

// "Sorpréndeme": baraja nombres bajo la campana y la levanta
function surprise() {
    const list = modalList();
    if (!list.length) return;
    let pick = Math.floor(Math.random() * list.length);
    if (list.length > 1 && pick === modalIndex) pick = (pick + 1) % list.length;
    modalIndex = pick;
    const chosen = list[pick];

    stopSurprise();
    showDessert(chosen, false);
    modal.classList.add('is-surprise');
    openModalEl(modal);

    const nameEl = document.getElementById('modal-name');
    const totalSteps = prefersReducedMotion ? 1 : 14;
    let step = 0;
    const tick = () => {
        if (step < totalSteps) {
            nameEl.textContent = list[Math.floor(Math.random() * list.length)].name;
            step++;
            surpriseTimer = setTimeout(tick, 40 + step * step * 1.5);
            return;
        }
        nameEl.textContent = chosen.name;
        modal.classList.add('is-revealed');
        const frame = modal.querySelector('.modal-img-frame');
        fx()?.burstFrom(frame, 'confetti');
        surpriseTimer = setTimeout(() => modal.classList.remove('is-surprise', 'is-revealed'), 850);
    };
    tick();
}

function orderFromModal() {
    const dessert = modalList()[modalIndex];
    if (!dessert) return;
    setFav(dessert.id, true);
    const subject = document.getElementById('subject');
    if (!subject.value.trim()) subject.value = `Encargo: ${dessert.name}`;
    closeModalEl(modal);
    document.getElementById('contact-section').scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    setTimeout(() => document.getElementById('name').focus({ preventScroll: true }), 700);
    fx()?.toast(`Añadido a tu encargo: ${dessert.name}`);
}

// ---------- Animaciones de aparición ----------

let revealObserver = null;

function setupReveal() {
    if (!('IntersectionObserver' in window)) {
        document.documentElement.classList.remove('js');
        return;
    }
    revealObserver = new IntersectionObserver(entries => {
        let k = 0;
        entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const el = entry.target;
            if (!el.style.getPropertyValue('--delay')) el.style.setProperty('--delay', `${Math.min(k++, 6) * 70}ms`);
            el.classList.add('is-visible');
            revealObserver.unobserve(el);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    observeReveals(document);
}

function observeReveals(root) {
    if (!revealObserver) {
        root.querySelectorAll('[data-reveal]').forEach(el => el.classList.add('is-visible'));
        return;
    }
    root.querySelectorAll('[data-reveal]:not(.is-visible)').forEach(el => revealObserver.observe(el));
}

function observeCake() {
    const cake = document.getElementById('cv-experience');
    const wrap = document.getElementById('cake-wrap');
    const build = () => {
        cake.classList.add('is-built');
        wrap.classList.add('is-built');
        const layers = cake.children.length;
        setTimeout(() => cake.classList.add('is-settled'), (layers * 170) + 800);
    };
    if (!('IntersectionObserver' in window)) return build();
    const obs = new IntersectionObserver(entries => {
        if (entries.some(e => e.isIntersecting)) {
            obs.disconnect();
            build();
        }
    }, { threshold: 0.2 });
    obs.observe(cake);
}

// ---------- Navegación ----------

function setActiveTab(href) {
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('href') === href);
    });
    moveNavBlob();
}

function moveNavBlob() {
    const blob = document.querySelector('.nav-blob');
    const active = document.querySelector('.nav-tab.active');
    if (!active) {
        blob.classList.remove('is-on');
        return;
    }
    blob.style.setProperty('--blob-x', active.offsetLeft + 'px');
    blob.style.setProperty('--blob-w', active.offsetWidth + 'px');
    blob.classList.add('is-on');
}

function setupEventListeners() {
    // Scroll spy
    const sections = document.querySelectorAll('main#portfolio, section#cv-section, section#contact-section');
    const headerOffset = 90;
    let current = null;
    let ticking = false;

    const spy = () => {
        ticking = false;
        let next = '';
        sections.forEach(section => {
            if (section.offsetParent === null) return;
            if (window.scrollY >= (section.offsetTop - headerOffset - 10)) {
                next = '#' + section.getAttribute('id');
            }
        });

        // Ensure that if we're at the very bottom, the last section is active
        if ((window.innerHeight + Math.round(window.scrollY)) >= document.body.offsetHeight - 2) {
            next = '#contact-section';
        }

        if (next !== current) {
            current = next;
            setActiveTab(current);
        }
    };

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(spy);
        }
    }, { passive: true });
    window.addEventListener('resize', moveNavBlob);
    document.fonts?.ready.then(moveNavBlob);
    spy();

    // Vitrina: tarjetas, filtros y "Sorpréndeme"
    document.getElementById('dessert-grid').addEventListener('click', e => {
        const card = e.target.closest('.dessert-card');
        if (!card) return;
        const id = card.dataset.id;
        const actionBtn = e.target.closest('[data-action]');
        if (actionBtn) {
            const action = actionBtn.dataset.action;
            if (action === 'fav') setFav(id, !isFav(id), actionBtn);
            else if (action === 'edit') editDessert(e, id);
            else if (action === 'delete') deleteDessert(e, id);
            return;
        }
        const dessert = getDessert(id);
        if (dessert) openModal(dessert);
    });

    document.getElementById('origin-chips').addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip || chip.dataset.filter === activeFilter) return;
        applyFilter(chip.dataset.filter, true);
        fx()?.burstFrom(chip, 'sparkles');
    });

    document.getElementById('btn-surprise').addEventListener('click', surprise);

    // Experiencia: abrir/cerrar capas
    document.getElementById('cv-experience').addEventListener('click', e => {
        const head = e.target.closest('.layer-head');
        if (!head) return;
        const layer = head.parentElement;
        const open = !layer.classList.contains('is-open');
        layer.classList.toggle('is-open', open);
        head.setAttribute('aria-expanded', String(open));
    });

    // Antojos en la comanda
    document.getElementById('antojos-list').addEventListener('click', e => {
        const btn = e.target.closest('[data-unfav]');
        if (btn) setFav(btn.dataset.unfav, false);
    });

    // Modal
    document.getElementById('modal-prev').onclick = () => stepModal(-1);
    document.getElementById('modal-next').onclick = () => stepModal(1);
    document.getElementById('modal-order').onclick = orderFromModal;
    document.getElementById('modal-fav').onclick = (e) => {
        const dessert = modalList()[modalIndex];
        if (dessert) setFav(dessert.id, !isFav(dessert.id), e.currentTarget);
    };

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => closeModalEl(document.getElementById(btn.getAttribute('data-target')));
    });

    // Clicking outside modal closes it
    document.querySelectorAll('.modal').forEach(m => {
        m.onclick = (e) => {
            if (e.target === m) closeModalEl(m);
        };
    });

    document.addEventListener('keydown', e => {
        const open = document.querySelector('.modal.active');
        if (!open) return;
        if (e.key === 'Escape') closeModalEl(open);
        if (open === modal && e.key === 'ArrowLeft') stepModal(-1);
        if (open === modal && e.key === 'ArrowRight') stepModal(1);
    });

    document.getElementById('btn-admin-toggle').onclick = () => {
        const panel = document.getElementById('admin-panel');
        panel.classList.toggle('hidden');
        document.body.classList.toggle('admin-active');

        if (!panel.classList.contains('hidden')) {
            // Populate profile form
            document.getElementById('p-name').value = portfolioData.profile.name || '';
            document.getElementById('p-contact').value = portfolioData.profile.contact || '';
            document.getElementById('p-phone').value = portfolioData.profile.phone || '';
            document.getElementById('p-bio').value = portfolioData.profile.bio || '';

            // Serialize experience array to text for editing
            if (Array.isArray(portfolioData.profile.experience)) {
                document.getElementById('p-exp').value = portfolioData.profile.experience.map(job =>
                    `${job.role} | ${job.company} | ${job.period} | ${job.country}\n${job.duties.join('\n')}`
                ).join('\n\n');
            } else {
                document.getElementById('p-exp').value = portfolioData.profile.experience || '';
            }

            // Serialize titles array to text
            if (Array.isArray(portfolioData.profile.titles)) {
                document.getElementById('p-titles').value = portfolioData.profile.titles.map(t =>
                    `${t.name} | ${t.institution} | ${t.period}`
                ).join('\n');
            } else {
                document.getElementById('p-titles').value = portfolioData.profile.titles || '';
            }
        }
    };

    document.getElementById('dessert-form').onsubmit = handleFormSubmit;
    document.getElementById('profile-form').onsubmit = handleProfileSubmit;
}

function checkAdminMode() {
    // Show admin button if running on localhost or 127.0.0.1
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.search.includes('admin=1')) {
        document.getElementById('btn-admin-toggle').classList.remove('hidden');
    }
}


// Form & Upload Logic
let editingDessertId = null;

function cancelEditMode() {
    editingDessertId = null;
    document.getElementById('dessert-form').reset();
    document.getElementById('d-main-img').required = true;
    document.getElementById('submit-btn').textContent = 'Guardar Postre';
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';
    document.getElementById('upload-status').textContent = '';
}

window.deleteDessert = async function(e, id) {
    e.stopPropagation(); // Prevent modal from opening
    if (confirm('¿Estás seguro de que quieres eliminar este postre?')) {
        portfolioData.desserts = portfolioData.desserts.filter(d => d.id !== id);
        await saveData();
        renderDesserts();
    }
};

window.editDessert = function(e, id) {
    e.stopPropagation();
    const dessert = portfolioData.desserts.find(d => d.id === id);
    if (!dessert) return;

    editingDessertId = id;

    const panel = document.getElementById('admin-panel');
    panel.classList.remove('hidden');

    const formContainer = document.getElementById('dessert-form').parentElement;
    const offsetPosition = formContainer.getBoundingClientRect().top + window.pageYOffset - 100;
    window.scrollTo({ top: offsetPosition, behavior: 'smooth' });

    document.getElementById('d-name').value = dessert.name;
    document.getElementById('d-origin').value = dessert.origin || '';
    document.getElementById('d-desc').value = dessert.description || '';

    document.getElementById('d-main-img').required = false;
    document.getElementById('submit-btn').textContent = 'Actualizar Postre';

    let cancelBtn = document.getElementById('cancel-edit-btn');
    if (!cancelBtn) {
        cancelBtn = document.createElement('button');
        cancelBtn.id = 'cancel-edit-btn';
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-secondary w-full';
        cancelBtn.style.marginTop = '1rem';
        cancelBtn.textContent = 'Cancelar Edición';
        cancelBtn.onclick = cancelEditMode;
        document.getElementById('dessert-form').appendChild(cancelBtn);
    }
    cancelBtn.style.display = 'block';
};

async function handleFormSubmit(e) {
    e.preventDefault();
    const statusMsg = document.getElementById('upload-status');
    const overlay = document.getElementById('loading-overlay');

    statusMsg.className = 'status-msg';
    statusMsg.textContent = '';
    overlay.classList.remove('hidden');

    try {
        const name = document.getElementById('d-name').value;
        const origin = document.getElementById('d-origin').value;
        const description = document.getElementById('d-desc').value;

        const mainImgFile = document.getElementById('d-main-img').files[0];
        const secImgFiles = document.getElementById('d-sec-img').files;

        let mainImgUrl;
        let secondaryImages = [];

        if (editingDessertId) {
            const existingDessert = portfolioData.desserts.find(d => d.id === editingDessertId);
            mainImgUrl = existingDessert.mainImage;
            secondaryImages = existingDessert.secondaryImages || [];
        }

        if (mainImgFile) {
            mainImgUrl = await uploadImage(mainImgFile);
        } else if (!editingDessertId) {
            throw new Error("La foto principal es obligatoria");
        }

        if (secImgFiles.length > 0) {
            secondaryImages = [];
            for (let i = 0; i < secImgFiles.length; i++) {
                const url = await uploadImage(secImgFiles[i]);
                secondaryImages.push(url);
            }
        }

        if (editingDessertId) {
            const index = portfolioData.desserts.findIndex(d => d.id === editingDessertId);
            if (index !== -1) {
                portfolioData.desserts[index] = {
                    ...portfolioData.desserts[index],
                    name, origin, description, mainImage: mainImgUrl, secondaryImages
                };
            }
        } else {
            const newDessert = {
                id: Date.now().toString(),
                name, origin, description, mainImage: mainImgUrl, secondaryImages
            };
            portfolioData.desserts.push(newDessert);
        }

        await saveData();

        const wasEditing = editingDessertId !== null;
        cancelEditMode();
        renderDesserts();
        statusMsg.textContent = wasEditing ? '¡Postre actualizado con éxito!' : '¡Postre guardado con éxito!';
        statusMsg.classList.add('success');

    } catch (error) {
        console.error(error);
        statusMsg.textContent = 'Error: ' + error.message;
        statusMsg.classList.add('error');
    } finally {
        overlay.classList.add('hidden');
    }
}

async function handleProfileSubmit(e) {
    e.preventDefault();
    const statusMsg = document.getElementById('profile-status');
    const overlay = document.getElementById('loading-overlay');

    statusMsg.className = 'status-msg';
    statusMsg.textContent = '';
    overlay.classList.remove('hidden');

    try {
        portfolioData.profile.name = document.getElementById('p-name').value;
        portfolioData.profile.contact = document.getElementById('p-contact').value;
        portfolioData.profile.phone = document.getElementById('p-phone').value;
        portfolioData.profile.bio = document.getElementById('p-bio').value;

        // Parse experience text back to structured array
        const expText = document.getElementById('p-exp').value.trim();
        if (expText) {
            portfolioData.profile.experience = expText.split('\n\n').map(block => {
                const lines = block.trim().split('\n');
                const headerParts = lines[0].split('|').map(s => s.trim());
                return {
                    role: headerParts[0] || '',
                    company: headerParts[1] || '',
                    period: headerParts[2] || '',
                    country: headerParts[3] || '',
                    duties: lines.slice(1).filter(l => l.trim())
                };
            });
        }

        // Parse titles text back to structured array
        const titlesText = document.getElementById('p-titles').value.trim();
        if (titlesText) {
            portfolioData.profile.titles = titlesText.split('\n').filter(l => l.trim()).map(line => {
                const parts = line.split('|').map(s => s.trim());
                return {
                    name: parts[0] || '',
                    institution: parts[1] || '',
                    period: parts[2] || ''
                };
            });
        }

        const imgFile = document.getElementById('p-img').files[0];
        if (imgFile) {
            portfolioData.profile.image = await uploadImage(imgFile);
        }

        await saveData();

        renderProfile();
        statusMsg.textContent = '¡Perfil actualizado con éxito!';
        statusMsg.classList.add('success');

    } catch (error) {
        console.error(error);
        statusMsg.textContent = 'Error: ' + error.message;
        statusMsg.classList.add('error');
    } finally {
        overlay.classList.add('hidden');
    }
}

async function uploadImage(file) {
    const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
            'X-File-Name': encodeURIComponent(file.name),
            'Content-Type': 'application/octet-stream'
        },
        body: file
    });

    if (!response.ok) throw new Error('Error al subir imagen');

    const result = await response.json();
    return result.url;
}

async function saveData() {
    const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(portfolioData)
    });

    if (!response.ok) throw new Error('Error al guardar datos');
}
