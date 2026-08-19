/* ==========================================================================
   Umubavu Protocol - Interactive Scripting & WhatsApp Booking Logic
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Footer Year
    const yearSpan = document.getElementById('year');
    if (yearSpan) {
        yearSpan.textContent = new Date().getFullYear();
    }

    // 2. Mobile Navigation Toggle
    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            const icon = mobileToggle.querySelector('i');
            if (icon) {
                icon.classList.toggle('fa-bars');
                icon.classList.toggle('fa-times');
            }
        });

        // Close menu when clicking links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                const icon = mobileToggle.querySelector('i');
                if (icon) {
                    icon.classList.add('fa-bars');
                    icon.classList.remove('fa-times');
                }
            });
        });
    }

    // 3. Navbar Sticky Effect & Active Scroll Indicator
    const navbar = document.getElementById('navbar');
    const sections = document.querySelectorAll('section');
    const navItems = document.querySelectorAll('.nav-link');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Active link highlighting
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop - 120;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                current = section.getAttribute('id');
            }
        });

        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('href') === `#${current}`) {
                item.classList.add('active');
            }
        });
    });

    // 4. Interactive Event Staff Estimator & WhatsApp Generator
    const eventTypeSelect = document.getElementById('event-type');
    const guestCountInput = document.getElementById('guest-count');
    const recStaffElement = document.getElementById('rec-staff');
    const recDetailsElement = document.getElementById('rec-details');
    const estimatorForm = document.getElementById('estimator-form');

    function calculateStaffRecommendation() {
        const guestCount = parseInt(guestCountInput.value) || 0;
        const eventType = eventTypeSelect.value;

        let ratio = 35; // Default 1 usher per 35 guests
        if (eventType === 'gala') ratio = 25; // More VIP attention
        if (eventType === 'wedding') ratio = 30;
        if (eventType === 'concert') ratio = 50;
        if (eventType === 'private') ratio = 25;

        let minStaff = Math.max(4, Math.ceil(guestCount / ratio));
        let maxStaff = minStaff + 2;

        recStaffElement.textContent = `${minStaff} - ${maxStaff} Protocol Officers`;

        // Update details based on count
        let detailsHtml = '';
        if (guestCount <= 150) {
            detailsHtml = `
                <span><i class="fas fa-check-circle"></i> 1 Senior Protocol Team Lead</span>
                <span><i class="fas fa-check-circle"></i> ${minStaff - 1} Uniformed Guest Ushers</span>
                <span><i class="fas fa-check-circle"></i> Entrance & Seating Coordination</span>
            `;
        } else if (guestCount <= 400) {
            detailsHtml = `
                <span><i class="fas fa-check-circle"></i> 1 Senior Protocol Team Lead</span>
                <span><i class="fas fa-check-circle"></i> 2 Dedicated VIP Escorts</span>
                <span><i class="fas fa-check-circle"></i> ${minStaff - 3} Guest Ushering & Gift Desk Staff</span>
                <span><i class="fas fa-check-circle"></i> Crowd Flow & Registration Desk</span>
            `;
        } else {
            detailsHtml = `
                <span><i class="fas fa-check-circle"></i> 2 Senior Protocol Team Supervisors</span>
                <span><i class="fas fa-check-circle"></i> 4 Dedicated VIP Escorts & Red Carpet Protocol</span>
                <span><i class="fas fa-check-circle"></i> ${minStaff - 6} Guest Ushers & Ticket / Wristband Staff</span>
                <span><i class="fas fa-check-circle"></i> Full Security & Crowd Management Support</span>
            `;
        }
        recDetailsElement.innerHTML = detailsHtml;
    }

    if (eventTypeSelect && guestCountInput) {
        eventTypeSelect.addEventListener('change', calculateStaffRecommendation);
        guestCountInput.addEventListener('input', calculateStaffRecommendation);
        // Initial calculation
        calculateStaffRecommendation();
    }

    // 5. Handle WhatsApp Form Submission
    if (estimatorForm) {
        estimatorForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const clientName = document.getElementById('client-name').value.trim();
            const clientPhone = document.getElementById('client-phone').value.trim();
            const eventType = eventTypeSelect.options[eventTypeSelect.selectedIndex].text;
            const guestCount = guestCountInput.value;
            const eventDate = document.getElementById('event-date').value;
            const eventLocation = document.getElementById('event-location').value.trim();
            const recommendedStaff = recStaffElement.textContent;

            // ── Save booking to Firebase Firestore Safely ──
            try {
                if (typeof db !== 'undefined' && db && typeof firebase !== 'undefined') {
                    db.collection('bookings').add({
                        name: clientName,
                        phone: clientPhone,
                        service: eventType,
                        guests: guestCount,
                        eventDate: eventDate || 'To be specified',
                        venue: eventLocation,
                        staffSuggested: recommendedStaff,
                        contacted: false,
                        submittedAt: new Date().toLocaleString('en-GB'),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(() => {
                        // Store booking details in localStorage to prompt them for testimonials later
                        localStorage.setItem('umubavu_booking_made', 'true');
                        localStorage.setItem('umubavu_client_name', clientName);
                        localStorage.setItem('umubavu_client_role', `${eventType} Host`);
                    }).catch(err => console.error("Error saving booking to Firestore: ", err));
                }
            } catch (err) {
                console.warn("Firebase save bypassed/failed:", err);
            }

            const message = `Hello *Umubavu Protocol*! 🌟\nI would like to request an event protocol & ushering quote.\n\n` +
                `👤 *Client Name:* ${clientName}\n` +
                `📞 *Phone:* ${clientPhone}\n` +
                `🎉 *Event Category:* ${eventType}\n` +
                `👥 *Expected Guests:* ${guestCount}\n` +
                `📅 *Event Date:* ${eventDate || 'To be specified'}\n` +
                `📍 *Venue/Location:* ${eventLocation}\n` +
                `⚡ *Suggested Staffing:* ${recommendedStaff}\n\n` +
                `Please confirm availability and share your official quotation. Thank you!`;

            const encodedMessage = encodeURIComponent(message);
            const whatsappUrl = `https://wa.me/250794173051?text=${encodedMessage}`;

            // Open WhatsApp link in new window
            window.open(whatsappUrl, '_blank');
        });
    }

    // 6. Contact Form Submission Handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const phone = document.getElementById('contact-phone-direct').value.trim();
            const messageText = document.getElementById('contact-message').value.trim();

            // ── Save contact inquiry to Firebase Firestore Safely ──
            try {
                if (typeof db !== 'undefined' && db && typeof firebase !== 'undefined') {
                    db.collection('contact_inquiries').add({
                        name: name,
                        email: email,
                        phone: phone,
                        message: messageText,
                        contacted: false,
                        submittedAt: new Date().toLocaleString('en-GB'),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    }).catch(err => console.error("Error saving inquiry to Firestore: ", err));
                }
            } catch (err) {
                console.warn("Firebase save bypassed/failed:", err);
            }

            const formattedMessage = `Hello *Umubavu Protocol*,\n` +
                `Inquiry from Website Form:\n` +
                `👤 Name: ${name}\n` +
                `📧 Email: ${email}\n` +
                `📞 Phone: ${phone}\n` +
                `📝 Message: ${messageText}`;

            const encoded = encodeURIComponent(formattedMessage);
            const targetUrl = `https://wa.me/250794173051?text=${encoded}`;
            window.open(targetUrl, '_blank');
        });
    }

    // 7. Dynamic Gallery Loader (Supports Video & Image files via Firebase Firestore)
    const galleryGrid = document.getElementById('gallery-grid');
    if (galleryGrid) {
        const DEFAULT_ITEMS = [
            { id: 'def_1', title: 'Royal Wedding Protocol', venue: 'Kigali, Rwanda', type: 'image', url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80' },
            { id: 'def_2', title: 'Annual Executive Gala', venue: 'VIP Red Carpet Escort', type: 'image', url: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80' },
            { id: 'def_3', title: 'International Summit', venue: 'Delegate Registration & Ushering', type: 'image', url: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=800&q=80' },
            { id: 'def_4', title: 'Precision Table Seating', venue: 'Banquet Guest Management', type: 'image', url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80' },
            { id: 'def_5', title: 'Crowd Control & Entry Protocol', venue: 'Concert Gate Coordination', type: 'image', url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=800&q=80' },
            { id: 'def_6', title: 'Team Briefing & Readiness', venue: 'Unmatched Professionalism', type: 'image', url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=800&q=80' }
        ];

        // Real-time Firestore sync with client-side sorting and one-time initialization flag
        const configRef = db.collection('config').doc('initialization');

        db.collection('gallery_items').onSnapshot(async (snapshot) => {
            let items = [];
            snapshot.forEach(doc => {
                items.push({ id: doc.id, ...doc.data() });
            });

            // Check config to see if we've ever initialized the defaults
            try {
                const configDoc = await configRef.get();
                if (!configDoc.exists && items.length === 0) {
                    // Mark as initialized first to prevent multiple writes
                    await configRef.set({
                        initialized: true,
                        initializedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    // Add default items to database
                    DEFAULT_ITEMS.forEach(async (item) => {
                        await db.collection('gallery_items').doc(item.id).set({
                            title: item.title,
                            venue: item.venue,
                            type: item.type,
                            url: item.url,
                            isDefault: true,
                            createdAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    return;
                }
            } catch (err) {
                console.warn("Failed database default check/init (likely permission/offline):", err);
            }

            // Sort client-side safely (handles missing/server timestamps)
            items.sort((a, b) => {
                const timeA = a.createdAt ? (a.createdAt.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime()) : 0;
                const timeB = b.createdAt ? (b.createdAt.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime()) : 0;
                return timeB - timeA; // Newest first
            });

            if (items.length === 0) {
                galleryGrid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                        <i class="fas fa-camera-retro" style="font-size: 2.5rem; color: var(--primary-gold); margin-bottom: 1rem;"></i>
                        <p>New event photos and videos coming soon!</p>
                    </div>
                `;
                return;
            }

            // Render gallery
            galleryGrid.innerHTML = items.map((item, index) => `
                <div class="gallery-item" data-index="${index}" style="cursor:pointer;">
                    ${item.type === 'video'
                        ? `<video src="${item.url}" preload="metadata" muted playsinline></video>
                           <div class="video-play-btn"><i class="fas fa-play" style="margin-left:3px;"></i></div>`
                        : `<img src="${item.url}" alt="${escapeHtml(item.title)}">`
                    }
                    <div class="gallery-overlay">
                        <h4>${escapeHtml(item.title)}</h4>
                        <p><i class="fas fa-map-marker-alt" style="color:var(--primary-gold);"></i> ${escapeHtml(item.venue)}</p>
                    </div>
                </div>
            `).join('');

            // Attach click listeners to open Lightbox
            document.querySelectorAll('.gallery-item').forEach((card) => {
                card.addEventListener('click', () => {
                    const idx = parseInt(card.getAttribute('data-index'));
                    openLightbox(items[idx]);
                });
            });
        }, (err) => {
            console.error('Firestore Gallery Listen Error:', err);
        });
    }

    // 7.5 Load dynamic "Who We Are" image
    const aboutSectionImg = document.getElementById('about-section-img');
    if (aboutSectionImg) {
        db.collection('site_config').doc('about_image').onSnapshot((doc) => {
            if (doc.exists && doc.data().url) {
                aboutSectionImg.src = doc.data().url;
            }
        }, (err) => {
            console.error('Error loading about image:', err);
        });
    }

    // 8. Fullscreen Lightbox Modal Controls
    const lightboxModal = document.getElementById('lightbox-modal');
    const lightboxContent = document.getElementById('lightbox-content');
    const lightboxCaption = document.getElementById('lightbox-caption');
    const lightboxClose = document.getElementById('lightbox-close');

    function openLightbox(item) {
        if (!lightboxModal) return;

        if (item.type === 'video') {
            // Render at 760p (1352x760) quality - controls, autoplay, explicit dimensions
            lightboxContent.innerHTML = `
                <video 
                    src="${item.url}" 
                    controls 
                    autoplay 
                    playsinline
                    width="1352" 
                    height="760"
                    style="width:100%; height:100%; object-fit:contain; background:#000; display:block; border-radius:12px;"
                ></video>`;
        } else {
            lightboxContent.innerHTML = `
                <img 
                    src="${item.url}" 
                    alt="${escapeHtml(item.title)}" 
                    style="width:100%; height:100%; object-fit:contain; display:block; border-radius:12px;"
                >`;
        }

        lightboxCaption.innerHTML = `
            <h3>${escapeHtml(item.title)}</h3>
            <p><i class="fas fa-map-marker-alt" style="color:var(--primary-gold);"></i> ${escapeHtml(item.venue)}</p>
        `;

        lightboxModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        if (!lightboxModal) return;
        lightboxModal.classList.remove('active');
        lightboxContent.innerHTML = '';
        lightboxCaption.innerHTML = '';
        document.body.style.overflow = '';
    }

    if (lightboxClose) {
        lightboxClose.addEventListener('click', closeLightbox);
    }

    if (lightboxModal) {
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                closeLightbox();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && lightboxModal && lightboxModal.classList.contains('active')) {
            closeLightbox();
        }
    });

    // --- Real-time Approved Testimonials Loader ---
    const testimonialsGrid = document.querySelector('.testimonials-grid');
    if (testimonialsGrid) {
        db.collection('testimonials')
            .where('status', '==', 'approved')
            .onSnapshot((snapshot) => {
                let testimonials = [];
                snapshot.forEach(doc => {
                    testimonials.push({ id: doc.id, ...doc.data() });
                });

                if (testimonials.length === 0) {
                    // Fallback to static defaults
                    testimonialsGrid.innerHTML = `
                        <div class="testimonial-card">
                            <div class="stars">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                            </div>
                            <p class="testimonial-text">
                                "Umubavu Protocol handled our wedding reception with absolute elegance. Their team was punctual, well-dressed, and handled our 400+ guests without a single hitch!"
                            </p>
                            <div class="client-info">
                                <strong>Keza & Eric M.</strong>
                                <span>Wedding Couple, Kigali</span>
                            </div>
                        </div>

                        <div class="testimonial-card featured-testimonial">
                            <div class="stars">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                            </div>
                            <p class="testimonial-text">
                                "For our corporate gala, VIP management was critical. Umubavu Protocol executed red carpet protocol flawlessly. Highly recommended for any high-stakes event."
                            </p>
                            <div class="client-info">
                                <strong>Jean-Pierre K.</strong>
                                <span>Event Director</span>
                            </div>
                        </div>

                        <div class="testimonial-card">
                            <div class="stars">
                                <i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i><i class="fas fa-star"></i>
                            </div>
                            <p class="testimonial-text">
                                "Great crowd management and guest ushering! They kept our entrance lines moving smoothly and ensured our guests felt welcomed immediately."
                            </p>
                            <div class="client-info">
                                <strong>Divine U.</strong>
                                <span>Private Party Host</span>
                            </div>
                        </div>
                    `;
                    return;
                }

                // Render dynamically
                testimonialsGrid.innerHTML = testimonials.map((t, index) => {
                    const isFeatured = index === 1 ? 'featured-testimonial' : '';
                    let starsHtml = '';
                    const r = t.rating || 5;
                    for (let i = 1; i <= 5; i++) {
                        starsHtml += `<i class="${i <= r ? 'fas' : 'far'} fa-star"></i>`;
                    }

                    return `
                        <div class="testimonial-card ${isFeatured}">
                            <div class="stars">
                                ${starsHtml}
                            </div>
                            <p class="testimonial-text">
                                "${escapeHtml(t.text)}"
                            </p>
                            <div class="client-info">
                                <strong>${escapeHtml(t.clientName)}</strong>
                                <span>${escapeHtml(t.eventRole)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }, (err) => {
                console.error("Testimonial Listen Error:", err);
            });
    }

    // --- Testimonial Modal Controls ---
    const testimonialModal = document.getElementById('testimonial-modal');
    const openTestimonialBtn = document.getElementById('open-testimonial-btn');
    const closeTestimonialBtn = document.getElementById('testimonial-modal-close');
    const testimonialForm = document.getElementById('testimonial-form');
    const ratingStars = document.querySelectorAll('#rating-stars i');
    let selectedRating = 5; // Default

    // Star Selection
    ratingStars.forEach(star => {
        // Init active state for first 5 stars
        star.classList.add('active');
        
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.getAttribute('data-rating'));
            ratingStars.forEach((s, idx) => {
                if (idx < selectedRating) {
                    s.classList.add('active');
                } else {
                    s.classList.remove('active');
                }
            });
        });
    });

    if (openTestimonialBtn && testimonialModal) {
        openTestimonialBtn.addEventListener('click', () => {
            testimonialModal.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Auto pre-fill if client has booking info saved
            const nameInput = document.getElementById('testimonial-name');
            const roleInput = document.getElementById('testimonial-role');
            const savedName = localStorage.getItem('umubavu_client_name');
            const savedRole = localStorage.getItem('umubavu_client_role');

            if (nameInput && savedName && !nameInput.value) {
                nameInput.value = savedName;
            }
            if (roleInput && savedRole && !roleInput.value) {
                roleInput.value = savedRole;
            }
        });
    }

    function closeTestimonial() {
        if (!testimonialModal) return;
        testimonialModal.classList.remove('active');
        document.body.style.overflow = '';
        if (testimonialForm) {
            testimonialForm.reset();
            // Reset stars to 5
            selectedRating = 5;
            ratingStars.forEach(s => s.classList.add('active'));
        }
    }

    if (closeTestimonialBtn) {
        closeTestimonialBtn.addEventListener('click', closeTestimonial);
    }

    if (testimonialModal) {
        testimonialModal.addEventListener('click', (e) => {
            if (e.target === testimonialModal) {
                closeTestimonial();
            }
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && testimonialModal && testimonialModal.classList.contains('active')) {
            closeTestimonial();
        }
    });

    // Submit form to Firestore
    if (testimonialForm) {
        testimonialForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('testimonial-name').value.trim();
            const role = document.getElementById('testimonial-role').value.trim();
            const text = document.getElementById('testimonial-text').value.trim();

            const submitBtn = testimonialForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Submitting...`;

            try {
                await db.collection('testimonials').add({
                    clientName: name,
                    eventRole: role,
                    rating: selectedRating,
                    text: text,
                    status: 'pending', // Requires approval
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });

                // Set testimonial completed state in browser so banner disappears
                localStorage.setItem('umubavu_testimonial_submitted', 'true');
                if (inviteBanner) {
                    inviteBanner.style.display = 'none';
                }

                alert('Thank you! Your testimonial has been submitted successfully and is awaiting review by our team.');
                closeTestimonial();
            } catch (err) {
                console.error("Testimonial submit error:", err);
                alert("Failed to submit review: " + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = `Submit Review`;
            }
        });
    }

    // --- Booking Testimonial Invite Banner Logic ---
    const inviteBanner = document.getElementById('booking-testimonial-banner');
    const bannerWriteBtn = document.getElementById('banner-write-btn');
    const bannerCloseBtn = document.getElementById('banner-close-btn');

    if (inviteBanner) {
        const hasBooked = localStorage.getItem('umubavu_booking_made') === 'true';
        const hasWrittenReview = localStorage.getItem('umubavu_testimonial_submitted') === 'true';

        if (hasBooked && !hasWrittenReview) {
            inviteBanner.style.display = 'block';
        }

        if (bannerCloseBtn) {
            bannerCloseBtn.addEventListener('click', () => {
                inviteBanner.style.display = 'none';
                localStorage.setItem('umubavu_booking_made', 'dismissed'); // Don't show again in this session
            });
        }

        if (bannerWriteBtn) {
            bannerWriteBtn.addEventListener('click', () => {
                inviteBanner.style.display = 'none';
                if (testimonialModal) {
                    testimonialModal.classList.add('active');
                    document.body.style.overflow = 'hidden';

                    // Pre-fill name and event details
                    const nameInput = document.getElementById('testimonial-name');
                    const roleInput = document.getElementById('testimonial-role');
                    const savedName = localStorage.getItem('umubavu_client_name');
                    const savedRole = localStorage.getItem('umubavu_client_role');

                    if (nameInput && savedName) nameInput.value = savedName;
                    if (roleInput && savedRole) roleInput.value = savedRole;
                }
            });
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
});
