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
    let currentFileObjectUrl = null;
    let currentFileType = null;
    let selectedFile = null; // Holds the actual file object for Firebase upload

    dropZone.addEventListener('click', () => fileInput.click());

    // 1. Prevent default drag behaviors window-wide to prevent browser from navigating/opening files on accidental drops
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        window.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    // 2. Add visual effects to the Drop Zone card on dragenter and dragover
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.add('dragover');
        }, false);
    });

    // 3. Remove visual effects on dragleave and drop
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.classList.remove('dragover');
        }, false);
    });

    // 4. Handle dropped file in the drop zone
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        if (dt && dt.files && dt.files.length > 0) {
            handleFileSelect(dt.files[0]);
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

        // Generate instant local blob URL for preview (takes 0ms, uses no memory)
        if (currentFileObjectUrl) {
            URL.revokeObjectURL(currentFileObjectUrl);
        }
        currentFileObjectUrl = URL.createObjectURL(file);

        previewContainer.innerHTML = currentFileType === 'video' 
            ? `<video src="${currentFileObjectUrl}" controls style="max-height: 250px; width: 100%; border-radius: 8px;"></video>`
            : `<img src="${currentFileObjectUrl}" style="max-height: 250px; width: 100%; object-fit: cover; border-radius: 8px;">`;
    }

    clearPreviewBtn.addEventListener('click', () => {
        if (currentFileObjectUrl) {
            URL.revokeObjectURL(currentFileObjectUrl);
            currentFileObjectUrl = null;
        }
        selectedFile = null;
        currentFileType = null;
        fileInput.value = '';
        previewContainer.innerHTML = '';
        previewBox.style.display = 'none';
        dropZone.style.display = 'block';
    });

    // --- Image Compression Utility ---
    function compressImage(file, maxWidth, quality) {
        return new Promise((resolve) => {
            const img = new Image();
            const url = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(url);
                const canvas = document.createElement('canvas');
                let w = img.width, h = img.height;
                if (w > maxWidth) {
                    h = Math.round(h * maxWidth / w);
                    w = maxWidth;
                }
                canvas.width = w;
                canvas.height = h;
                canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', quality);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(file); // Fallback: upload original if compression fails
            };
            img.src = url;
        });
    }

    // --- Media Upload Submission (to Firebase Storage & Firestore) ---
    const uploadForm = document.getElementById('upload-form');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            alert('Please select an image or video file to upload.');
            return;
        }

        submitBtn.disabled = true;

        try {
            const title = document.getElementById('media-title').value.trim();
            const category = document.getElementById('media-category').value;
            const venue = document.getElementById('media-venue').value.trim();

            // Compress images before upload (max 1600px wide, 75% JPEG quality)
            let fileToUpload = selectedFile;
            if (currentFileType === 'image') {
                submitBtn.innerHTML = `<i class="fas fa-compress"></i> Compressing image...`;
                const originalSize = selectedFile.size;
                fileToUpload = await compressImage(selectedFile, 1600, 0.75);
                const savedPct = Math.round((1 - fileToUpload.size / originalSize) * 100);
                console.log(`Compressed: ${(originalSize/1024/1024).toFixed(1)}MB → ${(fileToUpload.size/1024/1024).toFixed(1)}MB (saved ${savedPct}%)`);
            }

            const fileId = 'up_' + Date.now();
            const extension = currentFileType === 'video' ? (selectedFile.name.split('.').pop() || 'mp4') : 'jpg';
            const storagePath = `gallery/${fileId}.${extension}`;
            const storageRef = storage.ref().child(storagePath);

            // Upload with progress tracking
            const uploadTask = storageRef.put(fileToUpload);

            uploadTask.on('state_changed',
                (snapshot) => {
                    const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                    const mbDone = (snapshot.bytesTransferred / 1024 / 1024).toFixed(1);
                    const mbTotal = (snapshot.totalBytes / 1024 / 1024).toFixed(1);
                    submitBtn.innerHTML = `
                        <div style="width:100%;text-align:center;">
                            <div style="margin-bottom:4px;font-size:0.85rem;">Uploading ${mbDone} / ${mbTotal} MB</div>
                            <div style="background:rgba(0,0,0,0.3);border-radius:6px;height:8px;overflow:hidden;">
                                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#d4af37,#f0d060);border-radius:6px;transition:width 0.3s;"></div>
                            </div>
                            <div style="margin-top:3px;font-size:0.75rem;opacity:0.8;">${pct}%</div>
                        </div>`;
                },
                (err) => {
                    console.error('Upload Error:', err);
                    alert('Upload failed: ' + err.message);
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Publish to Live Gallery`;
                },
                async () => {
                    // Upload complete — save metadata to Firestore
                    submitBtn.innerHTML = `<i class="fas fa-check"></i> Saving to database...`;
                    const downloadUrl = await uploadTask.snapshot.ref.getDownloadURL();

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
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `<i class="fas fa-paper-plane"></i> Publish to Live Gallery`;
                }
            );
        } catch (err) {
            console.error('Upload Error:', err);
            alert('Error saving media: ' + err.message);
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
            .onSnapshot((snapshot) => {
                let items = [];
                snapshot.forEach(doc => {
                    items.push({ id: doc.id, ...doc.data() });
                });

                // Sort client-side safely
                items.sort((a, b) => {
                    const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
                    const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
                    return timeB - timeA;
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

    // ============================================================
    // CLOUD BOOKINGS SECTION (Firestore Sync)
    // ============================================================
    let bookingsListenerUnsubscribe = null;

    function setupRealtimeBookingsListener() {
        if (bookingsListenerUnsubscribe) return;

        const list = document.getElementById('bookings-list');
        const badge = document.getElementById('booking-badge');
        if (!list) return;

        bookingsListenerUnsubscribe = db.collection('bookings')
            .onSnapshot((snapshot) => {
                let bookings = [];
                snapshot.forEach(doc => {
                    bookings.push({ id: doc.id, ...doc.data() });
                });

                // Sort client-side safely
                bookings.sort((a, b) => {
                    const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
                    const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
                    return timeB - timeA;
                });

                if (badge) {
                    badge.textContent = bookings.length;
                }

                if (bookings.length === 0) {
                    list.innerHTML = `
                        <div style="text-align:center; padding:3rem; color:var(--text-muted);">
                            <i class="fas fa-inbox" style="font-size:2.5rem; color:var(--primary-gold); margin-bottom:1rem; display:block;"></i>
                            <p>No bookings yet. Booking requests from the website will appear here in real-time.</p>
                        </div>
                    `;
                    return;
                }

                list.innerHTML = bookings.map(b => `
                    <div class="booking-row" id="booking-${b.id}">
                        <div>
                            <div class="booking-label"><i class="fas fa-user"></i> Client Name</div>
                            <div class="booking-value">${escapeHtml(b.name || '—')}</div>
                            <div style="margin-top:0.4rem;">
                                <div class="booking-label"><i class="fas fa-phone"></i> Phone / WhatsApp</div>
                                <div class="booking-value">
                                    <a href="https://wa.me/${(b.phone || '').replace(/\s+/g, '')}" target="_blank"
                                       style="color:var(--primary-gold);text-decoration:none;font-weight:600;">
                                        <i class="fab fa-whatsapp"></i> ${escapeHtml(b.phone || '—')}
                                    </a>
                                </div>
                            </div>
                        </div>
                        <div>
                            <div class="booking-label"><i class="fas fa-calendar-alt"></i> Event Date</div>
                            <div class="booking-value">${escapeHtml(b.eventDate || '—')}</div>
                            <div style="margin-top:0.4rem;">
                                <div class="booking-label"><i class="fas fa-map-marker-alt"></i> Venue & Guests</div>
                                <div class="booking-value">${escapeHtml(b.venue || '—')} (${escapeHtml(String(b.guests || '0'))} guests)</div>
                            </div>
                        </div>
                        <div>
                            <div class="booking-label"><i class="fas fa-concierge-bell"></i> Service & Staff</div>
                            <div class="booking-value">${escapeHtml(b.service || '—')} (${escapeHtml(b.staffSuggested || '—')} staff)</div>
                            <div style="margin-top:0.4rem;">
                                <div class="booking-label"><i class="fas fa-clock"></i> Submitted</div>
                                <div class="booking-value" style="font-size:0.85rem; color:var(--text-secondary);">${b.submittedAt || '—'}</div>
                            </div>
                        </div>
                        <div class="booking-actions">
                            <span class="status-badge ${b.contacted ? 'status-done' : 'status-new'}" 
                                  onclick="toggleContacted('${b.id}', ${b.contacted})" 
                                  style="cursor:pointer; user-select:none; text-align:center;" 
                                  title="Click to toggle contacted status">
                                ${b.contacted ? '✓ Contacted' : '⏳ New'}
                            </span>
                            <button onclick="deleteBooking('${b.id}')" class="btn btn-danger" style="font-size:0.78rem; padding:0.35rem 0.8rem;">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                `).join('');
            }, (err) => {
                console.error("Firestore Bookings Listen Error:", err);
            });
    }

    // Toggle contacted status in Firestore
    window.toggleContacted = async function(id, currentStatus) {
        try {
            await db.collection('bookings').doc(id).update({
                contacted: !currentStatus
            });
        } catch (err) {
            console.error("Error updating booking status:", err);
            alert("Failed to update status: " + err.message);
        }
    };

    // Delete single booking from Firestore
    window.deleteBooking = async function(id) {
        if (confirm('Are you sure you want to remove this booking request from the portal?')) {
            try {
                await db.collection('bookings').doc(id).delete();
            } catch (err) {
                console.error("Error deleting booking:", err);
                alert("Failed to delete booking: " + err.message);
            }
        }
    };

    // Clear all bookings from Firestore
    window.clearAllBookings = async function() {
        if (confirm('Are you sure you want to delete ALL booking records permanently? This cannot be undone.')) {
            try {
                const snapshot = await db.collection('bookings').get();
                const batch = db.batch();
                snapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                alert('All bookings cleared successfully.');
            } catch (err) {
                console.error("Error clearing bookings:", err);
                alert("Failed to clear bookings: " + err.message);
            }
        }
    };

    // --- Tab Switcher Logic ---
    window.switchTab = function(tab) {
        const tabs = ['media', 'bookings'];
        tabs.forEach(t => {
            const btn = document.getElementById('tab-' + t);
            if (btn) btn.classList.toggle('active', t === tab);
            
            const panel = document.getElementById('panel-' + t);
            if (panel) panel.style.display = (t === tab) ? '' : 'none';
        });

        if (tab === 'bookings') {
            setupRealtimeBookingsListener();
        }
    };

    // Initialize bookings count badge immediately
    db.collection('bookings').onSnapshot((snapshot) => {
        const badge = document.getElementById('booking-badge');
        if (badge) {
            badge.textContent = snapshot.size;
        }
    }, (err) => {
        console.warn("Could not fetch bookings count:", err);
    });
});
