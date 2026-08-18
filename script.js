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

    // 7. Dynamic Gallery Loader (Supports Deletion & Uploads via Technician Portal)
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

        const stored = localStorage.getItem('umubavu_full_gallery');
        const items = stored ? JSON.parse(stored) : DEFAULT_ITEMS;

        if (items.length === 0) {
            galleryGrid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <i class="fas fa-camera-retro" style="font-size: 2.5rem; color: var(--primary-gold); margin-bottom: 1rem;"></i>
                    <p>New event photos coming soon!</p>
                </div>
            `;
        } else {
            galleryGrid.innerHTML = items.map(item => `
                <div class="gallery-item">
                    ${item.type === 'video'
                        ? `<video src="${item.url}" controls style="width:100%;height:100%;object-fit:cover;"></video>`
                        : `<img src="${item.url}" alt="${escapeHtml(item.title)}">`
                    }
                    <div class="gallery-overlay">
                        <h4>${escapeHtml(item.title)}</h4>
                        <p><i class="fas fa-map-marker-alt" style="color:var(--primary-gold);"></i> ${escapeHtml(item.venue)}</p>
                    </div>
                </div>
            `).join('');
        }
    }

    function escapeHtml(str) {
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
});
