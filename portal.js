/* ==========================================================================
   Umubavu Protocol - Technician Portal Logic (IndexedDB Large File Storage)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_PIN = "UMUBAVU2026";
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const pinInput = document.getElementById('pin-input');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    // Default Sample Items
    const DEFAULT_ITEMS = [
        { id: 'def_1', title: 'Royal Wedding Protocol', venue: 'Kigali, Rwanda', type: 'image', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80', isDefault: true, date: 'Default' },
        { id: 'def_2', title: 'Annual Executive Gala', venue: 'VIP Red Carpet Escort', type: 'image', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80', isDefault: true, date: 'Default' },
        { id: 'def_3', title: 'International Summit', venue: 'Delegate Registration & Ushering', type: 'image', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80', isDefault: true, date: 'Default' },
        { id: 'def_4', title: 'Precision Table Seating', venue: 'Banquet Guest Management', type: 'image', url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80', isDefault: true, date: 'Default' },
        { id: 'def_5', title: 'Crowd Control & Entry Protocol', venue: 'Concert Gate Coordination', type: 'image', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80', isDefault: true, date: 'Default' },
        { id: 'def_6', title: 'Team Briefing & Readiness', venue: 'Unmatched Professionalism', type: 'image', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80', isDefault: true, date: 'Default' }
    ];

    // --- IndexedDB Storage Helper (Supports Gigabyte Video & Image Storage) ---
    const DB_NAME = 'UmubavuGalleryDB';
    const DB_VERSION = 1;
    const STORE_NAME = 'gallery_items';

    function openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async function getGalleryItems() {
        try {
            const db = await openDB();
            return new Promise((resolve) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.getAll();
                request.onsuccess = async () => {
                    let items = request.result;
                    const initialized = localStorage.getItem('umubavu_db_init');
                    if (!initialized) {
                        // Populate default items ONLY ONCE on first initialization
                        for (const item of DEFAULT_ITEMS) {
                            await saveGalleryItem(item);
                        }
                        localStorage.setItem('umubavu_db_init', 'true');
                        items = DEFAULT_ITEMS;
                    }
                    resolve(items);
                };
            });
        } catch (err) {
            console.error('IndexedDB Error:', err);
            return DEFAULT_ITEMS;
        }
    }

    async function saveGalleryItem(item) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.put(item);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async function removeGalleryItem(id) {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        });
    }

    // --- PIN Authentication ---
    function checkAuth() {
        const isAuth = sessionStorage.getItem('umubavu_portal_auth');
        if (isAuth === 'true') {
            loginOverlay.style.display = 'none';
            renderMediaList();
        } else {
            loginOverlay.style.display = 'flex';
        }
    }

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const inputPin = pinInput.value.trim();
        if (inputPin === DEFAULT_PIN || inputPin === localStorage.getItem('umubavu_custom_pin')) {
            sessionStorage.setItem('umubavu_portal_auth', 'true');
            loginOverlay.style.display = 'none';
            loginError.style.display = 'none';
            renderMediaList();
        } else {
            loginError.style.display = 'block';
            pinInput.value = '';
            pinInput.focus();
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('umubavu_portal_auth');
        checkAuth();
    });

    checkAuth();

    // --- Drag & Drop / File Selection ---
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const previewBox = document.getElementById('preview-box');
    const previewContainer = document.getElementById('preview-container');
    const clearPreviewBtn = document.getElementById('clear-preview');
    const submitBtn = document.getElementById('submit-upload-btn');
    let currentFileDataUrl = null;
    let currentFileType = null;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
            alert('Please select a valid image (JPG, PNG) or video (MP4, WEBM) file.');
            return;
        }

        currentFileType = file.type.startsWith('video/') ? 'video' : 'image';
        
        // Indicate processing
        previewContainer.innerHTML = `<p style="padding:1rem;color:var(--primary-gold);"><i class="fas fa-spinner fa-spin"></i> Processing file (${(file.size / (1024*1024)).toFixed(1)} MB)...</p>`;
        previewBox.style.display = 'block';
        dropZone.style.display = 'none';

        const reader = new FileReader();

        reader.onload = (event) => {
            currentFileDataUrl = event.target.result;
            previewContainer.innerHTML = currentFileType === 'video' 
                ? `<video src="${currentFileDataUrl}" controls style="max-height: 250px; width: 100%; border-radius: 8px;"></video>`
                : `<img src="${currentFileDataUrl}" style="max-height: 250px; width: 100%; object-fit: cover; border-radius: 8px;">`;
        };

        reader.onerror = () => {
            alert('Error reading file. Please try a smaller or supported video format.');
            clearPreviewBtn.click();
        };

        reader.readAsDataURL(file);
    }

    clearPreviewBtn.addEventListener('click', () => {
        currentFileDataUrl = null;
        currentFileType = null;
        fileInput.value = '';
        previewContainer.innerHTML = '';
        previewBox.style.display = 'none';
        dropZone.style.display = 'block';
    });

    // --- Media Upload Submission ---
    const uploadForm = document.getElementById('upload-form');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!currentFileDataUrl) {
            alert('Please select an image or video file to upload.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Publishing Media...`;

        try {
            const title = document.getElementById('media-title').value.trim();
            const category = document.getElementById('media-category').value;
            const venue = document.getElementById('media-venue').value.trim();

            const newItem = {
                id: 'up_' + Date.now(),
                title: title,
                category: category,
                venue: venue,
                type: currentFileType,
                url: currentFileDataUrl,
                date: new Date().toLocaleDateString('en-GB')
            };

            await saveGalleryItem(newItem);

            alert('Media published successfully! Your photo/video is now live on the website gallery.');

            // Reset form
            uploadForm.reset();
            clearPreviewBtn.click();
            renderMediaList();
        } catch (err) {
            console.error('Upload Error:', err);
            alert('Error saving media. Please check file size and format.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Publish to Live Gallery`;
        }
    });

    // --- Render Media Manager List ---
    async function renderMediaList() {
        const mediaList = document.getElementById('media-list');
        const items = await getGalleryItems();

        if (!items || items.length === 0) {
            mediaList.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
                    <i class="fas fa-images" style="font-size: 2rem; margin-bottom: 0.5rem;"></i>
                    <p>Gallery is completely empty. Upload photos or videos to populate.</p>
                </div>
            `;
            return;
        }

        mediaList.innerHTML = items.map(item => `
            <div class="media-item" id="item-${item.id}">
                ${item.type === 'video' 
                    ? `<div class="media-item-thumb" style="display:flex;align-items:center;justify-content:center;background:#1a233a;color:var(--primary-gold);"><i class="fas fa-video"></i></div>`
                    : `<img src="${item.url}" class="media-item-thumb">`
                }
                <div class="media-item-info">
                    <h4>${escapeHtml(item.title)} ${item.isDefault ? '<span style="font-size:0.7rem;background:rgba(212,175,55,0.2);color:var(--primary-gold);padding:2px 6px;border-radius:4px;">Default Sample</span>' : ''}</h4>
                    <p><i class="fas fa-map-marker-alt" style="color:var(--primary-gold);"></i> ${escapeHtml(item.venue)}</p>
                </div>
                <button onclick="deleteMediaItem('${item.id}')" class="btn btn-danger">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `).join('');
    }

    window.deleteMediaItem = async function(id) {
        if (confirm('Are you sure you want to delete this media item from the website gallery?')) {
            await removeGalleryItem(id);
            renderMediaList();
        }
    };

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
});
