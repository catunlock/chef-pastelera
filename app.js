let portfolioData = { profile: {}, desserts: [] };

document.addEventListener('DOMContentLoaded', async () => {
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
        }
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

function renderProfile() {
    const profile = portfolioData.profile;
    document.getElementById('profile-name').textContent = profile.name || 'Chef Pastelera';
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
        const igUrl = profile.instagram.includes('http') ? profile.instagram : 'https://www.instagram.com/' + profile.instagram.replace('@', '');
        profileIG.href = igUrl;
        document.getElementById('profile-ig-text').textContent = igUrl.split('/').filter(Boolean).pop();
        profileIG.style.display = 'inline-flex';
    } else {
        profileIG.style.display = 'none';
    }

    const profileImg = document.getElementById('profile-img');
    if (profile.image) {
        profileImg.src = profile.image;
        profileImg.classList.remove('hidden');
    } else {
        profileImg.classList.add('hidden');
    }

    // Render CV section
    const cvSection = document.getElementById('cv-section');
    if (profile.experience || profile.titles) {
        cvSection.classList.remove('hidden');
        
        const expContainer = document.getElementById('cv-experience');
        expContainer.innerHTML = '';
        if (Array.isArray(profile.experience)) {
            profile.experience.forEach(job => {
                const card = document.createElement('div');
                card.className = 'exp-card';
                card.innerHTML = `
                    <div class="exp-header">
                        <div class="exp-title-row">
                            <h4 class="exp-role">${job.role}</h4>
                            <span class="exp-period">${job.period}</span>
                        </div>
                        <div class="exp-subtitle-row">
                            <span class="exp-company">${job.company}</span>
                            <span class="exp-country">${job.country}</span>
                        </div>
                    </div>
                    <ul class="exp-duties">
                        ${job.duties.map(d => `<li>${d}</li>`).join('')}
                    </ul>
                `;
                expContainer.appendChild(card);
            });
        }

        const titlesContainer = document.getElementById('cv-titles');
        titlesContainer.innerHTML = '';
        if (Array.isArray(profile.titles)) {
            profile.titles.forEach(title => {
                const item = document.createElement('div');
                item.className = 'cv-item';
                item.innerHTML = `
                    <p class="title-name">${title.name} <span class="title-period">(${title.period})</span></p>
                    <p class="title-institution">${title.institution}</p>
                `;
                titlesContainer.appendChild(item);
            });
        }

        const specContainer = document.getElementById('cv-specialties');
        specContainer.innerHTML = '';
        if (Array.isArray(profile.specialties)) {
            profile.specialties.forEach(spec => {
                const item = document.createElement('div');
                item.className = 'cv-item';
                item.innerHTML = `<p>${spec}</p>`;
                specContainer.appendChild(item);
            });
        }

        const langContainer = document.getElementById('cv-languages');
        langContainer.innerHTML = '';
        if (Array.isArray(profile.languages)) {
            profile.languages.forEach(lang => {
                const item = document.createElement('div');
                item.className = 'cv-item';
                item.innerHTML = `<p><strong>${lang.lang}</strong> — ${lang.level}</p>`;
                langContainer.appendChild(item);
            });
        }
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
        const igUrl = profile.instagram.includes('http') ? profile.instagram : 'https://www.instagram.com/' + profile.instagram.replace('@', '');
        footerIG.href = igUrl;
        const handle = '@' + igUrl.split('/').filter(Boolean).pop();
        footerIG.querySelector('span').textContent = handle;
        footerIG.style.display = 'flex';
    }
}

function renderDesserts() {
    const grid = document.getElementById('dessert-grid');
    grid.innerHTML = '';
    
    // Sort desserts newest first
    const desserts = [...(portfolioData.desserts || [])].reverse();
    
    desserts.forEach(dessert => {
        const card = document.createElement('div');
        card.className = 'dessert-card';
        card.onclick = () => openModal(dessert);
        
        card.innerHTML = `
            <div class="admin-actions no-print">
                <button onclick="editDessert(event, '${dessert.id}')" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.8rem;">Editar</button>
                <button onclick="deleteDessert(event, '${dessert.id}')" class="btn btn-danger btn-sm" style="padding: 0.2rem 0.5rem; font-size: 0.8rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Eliminar</button>
            </div>
            <div class="card-image-wrapper">
                <img src="${dessert.mainImage}" alt="${dessert.name}" class="card-image" loading="lazy">
            </div>
            <div class="card-content">
                <h3 class="card-title">${dessert.name}</h3>
                ${dessert.origin ? `<span class="card-origin">${dessert.origin}</span>` : ''}
                ${dessert.description ? `<p class="card-desc">${dessert.description}</p>` : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Modal Logic
const modal = document.getElementById('dessert-modal');
const closeModalBtn = document.querySelector('.close-modal');

function openModal(dessert) {
    document.getElementById('modal-main-img').src = dessert.mainImage;
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
            img.onclick = () => {
                // Swap main image
                const mainSrc = document.getElementById('modal-main-img').src;
                document.getElementById('modal-main-img').src = imgUrl;
                img.src = mainSrc;
            };
            secGallery.appendChild(img);
        });
    }
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden'; // Prevent scrolling
}

function setupEventListeners() {
    // Tabs & Scroll Spy Logic
    const tabs = document.querySelectorAll('.nav-tab');
    const sections = document.querySelectorAll('main#portfolio, section#cv-section, section#contact-section');
    const headerOffset = 80;
    
    // Smooth scrolling when clicking a tab
    tabs.forEach(tab => {
        tab.onclick = (e) => {
            e.preventDefault();
            const targetId = tab.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            if (!targetSection) return;
            
            const elementPosition = targetSection.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        };
    });

    // Scroll spy
    window.addEventListener('scroll', () => {
        let current = '';
        
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (pageYOffset >= (sectionTop - headerOffset - 10)) {
                current = '#' + section.getAttribute('id');
            }
        });
        
        // Ensure that if we're at the very bottom, the last section is active
        if ((window.innerHeight + Math.round(window.pageYOffset)) >= document.body.offsetHeight - 2) {
            current = '#contact-section';
        }

        tabs.forEach(tab => {
            tab.classList.remove('active');
            if (tab.getAttribute('href') === current) {
                tab.classList.add('active');
            }
        });
    });

    closeModalBtn.onclick = () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    };
    
    // Update close button logic to handle all modals
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            const targetId = btn.getAttribute('data-target');
            document.getElementById(targetId).classList.remove('active');
            document.body.style.overflow = '';
        };
    });
    
    // Clicking outside modal closes it
    document.querySelectorAll('.modal').forEach(m => {
        m.onclick = (e) => {
            if (e.target === m) {
                m.classList.remove('active');
                document.body.style.overflow = '';
            }
        };
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
