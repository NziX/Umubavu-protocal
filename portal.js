/* ==========================================================================
   Umubavu Protocol - Technician Portal Logic (Firebase Cloud Integration)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    const DEFAULT_PIN = "UMUBAVU2026";
    const loginOverlay = document.getElementById('login-overlay');
    const loginForm = document.getElementById('login-form');
    const pinInput = document.getElementById('pin-input');
    const loginError = document.getElementById('login-error');
    const logoutBtn = document.getElementById('logout-btn');

    // --- PIN Authentication ---
    function checkAuth() {
        const isAuth = sessionStorage.getItem('umubavu_portal_auth');
        if (isAuth === 'true') {
            loginOverlay.style.display = 'none';
            setupRealtimeMediaListener();
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
            setupRealtimeMediaListener();
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
    let selectedFile = null; // Holds the actual file object for Firebase upload

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
            alert('Please select a valid image (JPG, PNG, WEBP) or video (MP4, WEBM) file.');
            return;
        }

        selectedFile = file;
        currentFileType = file.type.startsWith('video/') ? 'video' : 'image';
        
        // Show progress indicator
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
            alert('Error reading file. Please choose a smaller file.');
            clearPreviewBtn.click();
        };

        reader.readAsDataURL(file);
    }

    clearPreviewBtn.addEventListener('click', () => {
        selectedFile = null;
        currentFileDataUrl = null;
        currentFileType = null;
        fileInput.value = '';
        previewContainer.innerHTML = '';
        previewBox.style.display = 'none';
        dropZone.style.display = 'block';
    });

    // --- Media Upload Submission (to Firebase Storage & Firestore) ---
    const uploadForm = document.getElementById('upload-form');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            alert('Please select an image or video file to upload.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Uploading to Cloud...`;

        try {
            const title = document.getElementById('media-title').value.trim();
            const category = document.getElementById('media-category').value;
            const venue = document.getElementById('media-venue').value.trim();

            const fileId = 'up_' + Date.now();
            const extension = selectedFile.name.split('.').pop() || (currentFileType === 'video' ? 'mp4' : 'jpg');
            const storagePath = `gallery/${fileId}.${extension}`;
            const storageRef = storage.ref().child(storagePath);

            // 1. Upload file object to Firebase Storage
            const uploadSnapshot = await storageRef.put(selectedFile);
            const downloadUrl = await uploadSnapshot.ref.getDownloadURL();

            // 2. Write metadata & URL to Cloud Firestore database
            await db.collection('gallery_items').doc(fileId).set({
                title: title,
                category: category,
                venue: venue,
                type: currentFileType,
                url: downloadUrl,
                storagePath: storagePath,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert('Media published successfully! Your photo/video is now live on the website gallery.');

            // Reset form UI
            uploadForm.reset();
            clearPreviewBtn.click();
        } catch (err) {
            console.error('Upload Error:', err);
            alert('Error saving media: ' + err.message);
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Publish to Live Gallery`;
        }
    });

    // --- Real-time Media List Renderer ---
    let mediaListenerUnsubscribe = null;

    function setupRealtimeMediaListener() {
        if (mediaListenerUnsubscribe) return; // Prevent duplicate listeners

        const mediaList = document.getElementById('media-list');
        if (!mediaList) return;

        mediaListenerUnsubscribe = db.collection('gallery_items')
            .orderBy('createdAt', 'desc')
            .onSnapshot((snapshot) => {
                let items = [];
                snapshot.forEach(doc => {
                    items.push({ id: doc.id, ...doc.data() });
                });

                if (items.length === 0) {
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
            }, (err) => {
                console.error("Firestore Manager Query Error:", err);
            });
    }

    // --- Delete Media Item ---
    window.deleteMediaItem = async function(id) {
        if (confirm('Are you sure you want to delete this media item? It will be removed permanently.')) {
            try {
                const docRef = db.collection('gallery_items').doc(id);
                const doc = await docRef.get();

                if (doc.exists) {
                    const itemData = doc.data();

                    // If it has a Storage reference, delete the physical file too
                    if (itemData.storagePath) {
                        try {
                            await storage.ref().child(itemData.storagePath).delete();
                        } catch (storageErr) {
                            console.warn("Storage deletion warning (file may not exist in cloud bucket):", storageErr);
                        }
                    }

                    // Delete database entry
                    await docRef.delete();
                }
            } catch (err) {
                console.error("Delete Action Error:", err);
                alert("Failed to delete media item: " + err.message);
            }
        }
    };

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
});
