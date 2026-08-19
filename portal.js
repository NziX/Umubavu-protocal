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

    // --- Image Compression Utility (returns File blob) ---
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
                    if (blob) {
                        resolve(new File([blob], file.name, {
                            type: 'image/jpeg',
                            lastModified: Date.now()
                        }));
                    } else {
                        resolve(file);
                    }
                }, 'image/jpeg', quality);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                resolve(file); // Fallback: return original if compression fails
            };
            img.src = url;
        });
    }

    // --- Image Compression Utility for About Image (returns base64 data URL) ---
    function compressImageToDataUrl(file, maxWidth, quality) {
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
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                resolve(dataUrl);
            };
            img.onerror = () => {
                URL.revokeObjectURL(url);
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => resolve(null);
                reader.readAsDataURL(file);
            };
            img.src = url;
        });
    }

    // --- Cloudinary Upload Helper ---
    function uploadToCloudinary(file, fileType) {
        const cloudName = cloudinaryConfig.cloudName;
        const uploadPreset = cloudinaryConfig.uploadPreset;

        if (!cloudName || cloudName === "YOUR_CLOUDINARY_CLOUD_NAME" || !uploadPreset || uploadPreset === "YOUR_CLOUDINARY_UPLOAD_PRESET") {
            throw new Error("Cloudinary configuration is missing. Click 'Publish to Live Gallery' and follow the setup instructions.");
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', uploadPreset);
        formData.append('resource_type', fileType === 'video' ? 'video' : 'image');

        const url = `https://api.cloudinary.com/v1_1/${cloudName}/upload`;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('POST', url, true);

            // Live progress tracker
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const pct = Math.round((e.loaded / e.total) * 100);
                    const mbDone = (e.loaded / 1024 / 1024).toFixed(1);
                    const mbTotal = (e.total / 1024 / 1024).toFixed(1);
                    submitBtn.innerHTML = `
                        <div style="width:100%;text-align:center;">
                            <div style="margin-bottom:4px;font-size:0.85rem;">Uploading to Cloudinary: ${mbDone} / ${mbTotal} MB</div>
                            <div style="background:rgba(0,0,0,0.3);border-radius:6px;height:8px;overflow:hidden;">
                                <div style="width:${pct}%;height:100%;background:linear-gradient(90deg,#d4af37,#f0d060);border-radius:6px;transition:width 0.3s;"></div>
                            </div>
                            <div style="margin-top:3px;font-size:0.75rem;opacity:0.8;">${pct}%</div>
                        </div>`;
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response.secure_url);
                } else {
                    const errResponse = JSON.parse(xhr.responseText || "{}");
                    reject(new Error(errResponse.error?.message || `Upload failed with status ${xhr.status}`));
                }
            };

            xhr.onerror = () => {
                reject(new Error('Network error during upload to Cloudinary.'));
            };

            xhr.send(formData);
        });
    }

    // --- Media Upload Submission (Direct to Cloudinary & Firestore metadata) ---
    const uploadForm = document.getElementById('upload-form');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!selectedFile) {
            alert('Please select an image or video file to upload.');
            return;
        }

        const cloudName = cloudinaryConfig.cloudName;
        const uploadPreset = cloudinaryConfig.uploadPreset;

        // Check if configuration placeholders are still active
        if (!cloudName || cloudName === "YOUR_CLOUDINARY_CLOUD_NAME" || !uploadPreset || uploadPreset === "YOUR_CLOUDINARY_UPLOAD_PRESET") {
            alert(
                '⚠️ Cloudinary Account Configuration Needed!\n\n' +
                'To enable free image and video uploads, follow these 3 quick steps:\n' +
                '1. Sign up for a free account at: cloudinary.com\n' +
                '2. Find your "Cloud Name" on your dashboard.\n' +
                '3. Go to Settings → Upload tab → Add upload preset. Set "Signing Mode" to "Unsigned" and click Save.\n' +
                '4. Open the file "firebase-config.js" in your website folder, replace the values inside the cloudinaryConfig section, and save.\n\n' +
                'Once saved, uploads will work automatically!'
            );
            return;
        }

        submitBtn.disabled = true;

        try {
            const title = document.getElementById('media-title').value.trim();
            const category = document.getElementById('media-category').value;
            const venue = document.getElementById('media-venue').value.trim();

            let fileToUpload = selectedFile;

            // Compress images client-side before sending to Cloudinary
            if (currentFileType === 'image') {
                submitBtn.innerHTML = `<i class="fas fa-compress"></i> Compressing image...`;
                fileToUpload = await compressImage(selectedFile, 1600, 0.75);
            } else {
                submitBtn.innerHTML = `<i class="fas fa-video"></i> Preparing video...`;
            }

            // Upload directly to Cloudinary
            const secureUrl = await uploadToCloudinary(fileToUpload, currentFileType);

            // Save metadata and Cloudinary URL to Firestore
            submitBtn.innerHTML = `<i class="fas fa-check"></i> Saving metadata...`;
            const fileId = 'up_' + Date.now();
            await db.collection('gallery_items').doc(fileId).set({
                title: title,
                category: category,
                venue: venue,
                type: currentFileType,
                url: secureUrl,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            alert(`✅ ${currentFileType === 'video' ? 'Video' : 'Photo'} published successfully! It is now live on the website gallery.`);

            // Reset form UI
            uploadForm.reset();
            clearPreviewBtn.click();
        } catch (err) {
            console.error('Upload Error:', err);
            alert('Upload failed: ' + err.message);
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
                await db.collection('gallery_items').doc(id).delete();
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
    // ABOUT SECTION IMAGE CHANGER
    // ============================================================
    const aboutImgBtn = document.getElementById('about-img-btn');
    const aboutImgInput = document.getElementById('about-img-input');
    const aboutImgCurrent = document.getElementById('about-img-current');
    const DEFAULT_ABOUT_IMAGE = 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80';

    // Load current about image from Firestore
    db.collection('site_config').doc('about_image').get().then((doc) => {
        if (doc.exists && doc.data().url) {
            aboutImgCurrent.src = doc.data().url;
        } else {
            aboutImgCurrent.src = DEFAULT_ABOUT_IMAGE;
        }
    }).catch(() => {
        aboutImgCurrent.src = DEFAULT_ABOUT_IMAGE;
    });

    aboutImgBtn.addEventListener('click', () => aboutImgInput.click());

    aboutImgInput.addEventListener('change', async (e) => {
        if (e.target.files.length === 0) return;
        const file = e.target.files[0];

        if (!file.type.startsWith('image/')) {
            alert('Please select an image file (JPG, PNG, WEBP).');
            return;
        }

        aboutImgBtn.disabled = true;
        aboutImgBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Compressing...`;

        try {
            // Compress to base64 data URL
            const dataUrl = await compressImageToDataUrl(file, 1200, 0.70);

            if (!dataUrl) {
                throw new Error('Failed to process image.');
            }

            // Check size
            if (dataUrl.length > 900000) {
                const smallerUrl = await compressImageToDataUrl(file, 800, 0.50);
                if (!smallerUrl || smallerUrl.length > 900000) {
                    alert('Image is too large. Please use a smaller or lower-resolution photo.');
                    return;
                }
                await saveAboutImage(smallerUrl);
            } else {
                await saveAboutImage(dataUrl);
            }

            async function saveAboutImage(imageUrl) {
                aboutImgBtn.innerHTML = `<i class="fas fa-cloud-upload-alt"></i> Saving...`;
                await db.collection('site_config').doc('about_image').set({
                    url: imageUrl,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                aboutImgCurrent.src = imageUrl;
                alert('✅ "Who We Are" photo updated! It is now live on the homepage.');
            }
        } catch (err) {
            console.error('About image error:', err);
            alert('Error: ' + err.message);
        } finally {
            aboutImgBtn.disabled = false;
            aboutImgBtn.innerHTML = `<i class="fas fa-camera"></i> Choose New Photo`;
            aboutImgInput.value = '';
        }
    });

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
        const tabs = ['media', 'bookings', 'testimonials'];
        tabs.forEach(t => {
            const btn = document.getElementById('tab-' + t);
            if (btn) btn.classList.toggle('active', t === tab);
            
            const panel = document.getElementById('panel-' + t);
            if (panel) panel.style.display = (t === tab) ? '' : 'none';
        });

        if (tab === 'bookings') {
            setupRealtimeBookingsListener();
        } else if (tab === 'testimonials') {
            setupRealtimeTestimonialsListener();
        }
    };

    // ============================================================
    // PORTAL TESTIMONIALS MANAGER (Firestore Sync)
    // ============================================================
    let testimonialsListenerUnsubscribe = null;

    function setupRealtimeTestimonialsListener() {
        if (testimonialsListenerUnsubscribe) return;

        const list = document.getElementById('testimonials-list');
        if (!list) return;

        testimonialsListenerUnsubscribe = db.collection('testimonials')
            .onSnapshot((snapshot) => {
                let testimonials = [];
                snapshot.forEach(doc => {
                    testimonials.push({ id: doc.id, ...doc.data() });
                });

                // Sort client-side safely (newest first)
                testimonials.sort((a, b) => {
                    const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
                    const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
                    return timeB - timeA;
                });

                if (testimonials.length === 0) {
                    list.innerHTML = `
                        <div style="text-align:center; padding:3rem; color:var(--text-muted);">
                            <i class="fas fa-quote-right" style="font-size:2.5rem; color:var(--primary-gold); margin-bottom:1rem; display:block;"></i>
                            <p>No testimonials submitted by clients yet.</p>
                        </div>
                    `;
                    return;
                }

                list.innerHTML = testimonials.map(t => {
                    const isApproved = t.status === 'approved';
                    const ratingStars = Array(t.rating || 5).fill('<i class="fas fa-star" style="color:var(--primary-gold); font-size:0.85rem;"></i>').join('');
                    
                    return `
                        <div class="booking-item" id="testimonial-${t.id}">
                            <div class="booking-details">
                                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem;">
                                    <h4 style="margin:0;">${escapeHtml(t.clientName || 'Anonymous')}</h4>
                                    <span style="font-size:0.75rem; background:rgba(212,175,55,0.15); color:var(--primary-gold); padding:2px 6px; border-radius:4px;">${escapeHtml(t.eventRole || 'Client')}</span>
                                </div>
                                <div style="margin-bottom:0.5rem;">${ratingStars}</div>
                                <p style="font-style:italic; color:var(--text-secondary); margin:0 0 0.5rem 0; font-size:0.9rem;">"${escapeHtml(t.text)}"</p>
                                <div style="font-size:0.75rem; color:var(--text-muted);">
                                    Submitted: ${t.createdAt ? (t.createdAt.toDate ? t.createdAt.toDate().toLocaleString() : new Date(t.createdAt).toLocaleString()) : 'Just now'}
                                </div>
                            </div>
                            <div class="booking-actions">
                                <button onclick="toggleApproveTestimonial('${t.id}', '${t.status}')" class="btn ${isApproved ? 'btn-secondary' : 'btn-success'}" style="font-size:0.78rem; padding:0.35rem 0.8rem; white-space:nowrap;">
                                    ${isApproved ? '<i class="fas fa-times-circle"></i> Unapprove' : '<i class="fas fa-check-circle"></i> Approve'}
                                </button>
                                <button onclick="deleteTestimonial('${t.id}')" class="btn btn-danger" style="font-size:0.78rem; padding:0.35rem 0.8rem; white-space:nowrap;">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `;
                }).join('');
            }, (err) => {
                console.error("Testimonials Listen Error:", err);
            });
    }

    // Toggle Approval status
    window.toggleApproveTestimonial = async function(id, currentStatus) {
        const nextStatus = currentStatus === 'approved' ? 'pending' : 'approved';
        try {
            await db.collection('testimonials').doc(id).update({
                status: nextStatus
            });
        } catch (err) {
            console.error("Error updating testimonial approval:", err);
            alert("Failed to update status: " + err.message);
        }
    };

    // Delete testimonial
    window.deleteTestimonial = async function(id) {
        if (confirm('Are you sure you want to delete this testimonial?')) {
            try {
                await db.collection('testimonials').doc(id).delete();
            } catch (err) {
                console.error("Error deleting testimonial:", err);
                alert("Failed to delete testimonial: " + err.message);
            }
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

    // Initialize testimonials count badge for pending status
    db.collection('testimonials').where('status', '==', 'pending').onSnapshot((snapshot) => {
        const badge = document.getElementById('testimonial-badge');
        if (badge) {
            if (snapshot.size > 0) {
                badge.style.display = 'inline-block';
                badge.textContent = snapshot.size;
            } else {
                badge.style.display = 'none';
            }
        }
    }, (err) => {
        console.warn("Could not fetch testimonials count:", err);
    });
});
