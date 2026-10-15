/**
 * Kisan Sahayak — Interactive JavaScript Handlers
 * Features: Mobile drawer, AJAX bookmarking, post likes, star ratings, modal controllers, 
 * client-side filtering, scroll reveals, back-to-top button, smooth UI transitions.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initBookmarks();
  initLikes();
  initRatingModal();
  initResourceDetailsModal();
  initAdminModals();
  initClientSearchFilter();
  initFlashDismissal();
  initScrollReveal();
  initBackToTop();
  initLanguageSwitcher();
});

// Helper to get CSRF token from meta tag
function getCsrfToken() {
  const meta = document.querySelector('meta[name="csrf-token"]');
  return meta ? meta.getAttribute('content') : '';
}

// Helper to safely escape text to prevent XSS
function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// --- AUTO DISMISS FLASH MESSAGES ---
function initFlashDismissal() {
  document.querySelectorAll('.flash-container .alert').forEach(alert => {
    if (alert.classList.contains('alert-success') || alert.classList.contains('alert-info')) {
      setTimeout(() => {
        alert.style.opacity = '0';
        alert.style.transform = 'translateY(-8px)';
        setTimeout(() => {
          if (alert.parentElement) {
            alert.remove();
          }
        }, 400);
      }, 4500);
    }
  });
}

// --- 1. MOBILE NAVIGATION DRAWER ---
function initMobileNav() {
  const hamburgerBtn = document.getElementById('hamburgerBtn');
  const mobileDrawer = document.getElementById('mobileNavDrawer');

  if (hamburgerBtn && mobileDrawer) {
    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      mobileDrawer.classList.toggle('open');
      const icon = hamburgerBtn.querySelector('i');
      if (icon) {
        if (mobileDrawer.classList.contains('open')) {
          icon.classList.remove('fa-bars');
          icon.classList.add('fa-xmark');
        } else {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
      }
    });

    document.addEventListener('click', (e) => {
      if (!mobileDrawer.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        mobileDrawer.classList.remove('open');
        const icon = hamburgerBtn.querySelector('i');
        if (icon) {
          icon.classList.remove('fa-xmark');
          icon.classList.add('fa-bars');
        }
      }
    });
  }
}

// --- 2. AJAX BOOKMARK TOGGLE ---
function initBookmarks() {
  document.querySelectorAll('.bookmark-btn-toggle').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const resId = btn.getAttribute('data-id');
      if (!resId) return;

      try {
        const response = await fetch('/api/bookmark/toggle', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': getCsrfToken()
          },
          body: JSON.stringify({ resource_id: resId })
        });

        if (response.status === 401) {
          window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname);
          return;
        }

        const data = await response.json();
        if (data.status === 'success') {
          const icon = btn.querySelector('i');
          if (data.action === 'saved') {
            btn.classList.add('saved');
            if (icon) {
              icon.classList.remove('fa-regular');
              icon.classList.add('fa-solid');
            }
            showToast('Saved to your Farmer Dashboard!', 'success');
          } else {
            btn.classList.remove('saved');
            if (icon) {
              icon.classList.remove('fa-solid');
              icon.classList.add('fa-regular');
            }
            showToast('Removed from saved items.', 'info');
            // If on bookmarks page, remove card smoothly
            const card = btn.closest('.resource-card');
            if (card && window.location.pathname.includes('/bookmarks')) {
              card.style.opacity = '0';
              card.style.transform = 'scale(0.9)';
              setTimeout(() => card.remove(), 250);
            }
          }
        }
      } catch (err) {
        console.error('Bookmark error:', err);
      }
    });
  });
}

// --- 3. AJAX COMMUNITY POST LIKES ---
function initLikes() {
  document.querySelectorAll('.like-btn-ajax').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const postId = btn.getAttribute('data-post-id');
      if (!postId) return;

      try {
        const response = await fetch(`/api/community/like/${postId}`, {
          method: 'POST',
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': getCsrfToken()
          }
        });

        if (response.status === 401 || response.redirected) {
          window.location.href = '/login?next=/community';
          return;
        }

        const data = await response.json();
        if (data.status === 'success') {
          const countSpan = btn.querySelector('.like-count');
          const icon = btn.querySelector('i');

          if (countSpan) countSpan.textContent = data.total_likes;
          if (data.action === 'liked') {
            btn.classList.add('liked');
            if (icon) {
              icon.classList.remove('fa-regular');
              icon.classList.add('fa-solid');
            }
          } else {
            btn.classList.remove('liked');
            if (icon) {
              icon.classList.remove('fa-solid');
              icon.classList.add('fa-regular');
            }
          }
        }
      } catch (err) {
        console.error('Like error:', err);
      }
    });
  });
}

// --- 4. STAR RATING & FEEDBACK MODAL ---
function initRatingModal() {
  const ratingModal = document.getElementById('ratingModal');
  if (!ratingModal) return;

  const resIdInput = document.getElementById('ratingResourceId');
  const resTitleEl = document.getElementById('ratingResourceTitle');
  const ratingValueInput = document.getElementById('ratingValue');
  const starIcons = ratingModal.querySelectorAll('.star-rating-picker i');

  document.querySelectorAll('.open-rating-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');

      if (resIdInput) resIdInput.value = id;
      if (resTitleEl) resTitleEl.textContent = title;
      if (ratingValueInput) ratingValueInput.value = '5';
      updateStars(5);

      openModal('ratingModal');
    });
  });

  starIcons.forEach(star => {
    star.addEventListener('click', () => {
      const val = parseInt(star.getAttribute('data-val'));
      if (ratingValueInput) ratingValueInput.value = val;
      updateStars(val);
    });
  });

  function updateStars(val) {
    starIcons.forEach(s => {
      const sVal = parseInt(s.getAttribute('data-val'));
      if (sVal <= val) {
        s.classList.add('active');
        s.classList.remove('fa-regular');
        s.classList.add('fa-solid');
      } else {
        s.classList.remove('active');
        s.classList.remove('fa-solid');
        s.classList.add('fa-regular');
      }
    });
  }
}

// --- 5. RESOURCE DETAILS MODAL (XSS-Safe) ---
function initResourceDetailsModal() {
  const detailsModal = document.getElementById('resourceDetailsModal');
  if (!detailsModal) return;

  document.querySelectorAll('.open-details-modal').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      const resId = btn.getAttribute('data-id');
      if (!resId) return;

      try {
        const response = await fetch(`/api/resource/${resId}`);
        if (!response.ok) {
          showToast('Unable to load resource details.', 'danger');
          return;
        }
        const data = await response.json();

        document.getElementById('modalResTitle').textContent = data.title || '';
        document.getElementById('modalResCategory').textContent = data.category_name || data.resource_type || '';
        document.getElementById('modalResDesc').textContent = data.description || '';
        document.getElementById('modalResProvider').textContent = data.provider || 'Official Agricultural Agency';
        
        const infoBox = document.getElementById('modalResInfoBox');
        let html = '';
        if (data.season_climate) {
          html += `<div class="resource-info-row"><i class="fa-solid fa-cloud-sun"></i> <div><strong>Details:</strong> ${escapeHTML(data.season_climate)}</div></div>`;
        }
        if (data.eligibility) {
          html += `<div class="resource-info-row"><i class="fa-solid fa-user-check"></i> <div><strong>Eligibility:</strong> ${escapeHTML(data.eligibility)}</div></div>`;
        }
        if (data.benefits) {
          html += `<div class="resource-info-row"><i class="fa-solid fa-hand-holding-dollar"></i> <div><strong>Key Benefits:</strong> ${escapeHTML(data.benefits)}</div></div>`;
        }
        infoBox.innerHTML = html;

        const extBtn = document.getElementById('modalResExternalLink');
        if (extBtn) {
          if (data.external_url) {
            extBtn.href = data.external_url;
            extBtn.style.display = 'inline-flex';
          } else {
            extBtn.style.display = 'none';
          }
        }

        openModal('resourceDetailsModal');
      } catch (err) {
        console.error('Fetch resource details error:', err);
      }
    });
  });
}

// --- 6. ADMIN MODALS ---
function initAdminModals() {
  // Edit Resource Modal
  document.querySelectorAll('.admin-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const title = btn.getAttribute('data-title');
      const type = btn.getAttribute('data-type');
      const category = btn.getAttribute('data-category');
      const desc = btn.getAttribute('data-desc');
      const url = btn.getAttribute('data-url');
      const provider = btn.getAttribute('data-provider');
      const climate = btn.getAttribute('data-climate');
      const eligibility = btn.getAttribute('data-eligibility');
      const benefits = btn.getAttribute('data-benefits');

      const form = document.getElementById('editResourceForm');
      if (form) {
        form.action = `/admin/resource/edit/${id}`;
        document.getElementById('editResTitle').value = title || '';
        document.getElementById('editResType').value = type || 'scheme';
        document.getElementById('editResCategory').value = category || '';
        document.getElementById('editResDesc').value = desc || '';
        document.getElementById('editResUrl').value = url || '';
        document.getElementById('editResProvider').value = provider || '';
        document.getElementById('editResClimate').value = climate || '';
        document.getElementById('editResEligibility').value = eligibility || '';
        document.getElementById('editResBenefits').value = benefits || '';

        openModal('editResourceModal');
      }
    });
  });
}

// --- 7. CLIENT-SIDE FAST LIVE SEARCH ---
function initClientSearchFilter() {
  const liveSearchInput = document.getElementById('liveFilterInput');
  if (!liveSearchInput) return;

  liveSearchInput.addEventListener('input', (e) => {
    const val = e.target.value.toLowerCase().trim();
    const cards = document.querySelectorAll('.resource-card, .feature-card');

    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (text.includes(val)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
}

// --- 8. SCROLL REVEAL ANIMATIONS ---
function initScrollReveal() {
  // Check if prefers-reduced-motion is enabled
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const elementsToReveal = document.querySelectorAll(
    '.resource-card, .dash-summary-card, .feature-card, .section-header, .stat-box, .weather-hero-card, .mandi-table-card, .post-card, .auth-card, .agri-tip-card, .quick-access-btn'
  );

  if (elementsToReveal.length === 0) return;

  if (!('IntersectionObserver' in window)) {
    elementsToReveal.forEach(el => el.classList.add('is-revealed'));
    return;
  }

  // Stagger grid items gracefully
  const grids = document.querySelectorAll('.resource-grid, .dash-summary-grid, .features-grid, .stats-grid, .quick-access-grid, .forecast-grid');
  grids.forEach(grid => {
    Array.from(grid.children).forEach((child, index) => {
      child.style.transitionDelay = `${Math.min(index * 0.06, 0.3)}s`;
    });
  });

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.08,
    rootMargin: '0px 0px -25px 0px'
  });

  elementsToReveal.forEach(el => {
    el.classList.add('reveal-on-scroll');
    revealObserver.observe(el);
  });
}

// --- 9. BACK TO TOP FLOATING BUTTON ---
function initBackToTop() {
  let btn = document.getElementById('backToTopBtn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'backToTopBtn';
    btn.className = 'back-to-top-btn';
    btn.setAttribute('aria-label', 'Back to top of page');
    btn.setAttribute('title', 'Scroll to top');
    btn.innerHTML = '<i class="fa-solid fa-arrow-up"></i>';
    document.body.appendChild(btn);
  }

  let isTicking = false;
  window.addEventListener('scroll', () => {
    if (!isTicking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 280) {
          btn.classList.add('show');
        } else {
          btn.classList.remove('show');
        }
        isTicking = false;
      });
      isTicking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

// --- GLOBAL MODAL CONTROLLERS ---
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = 'auto';
  }
}

// Close modals when clicking backdrop or close buttons
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-backdrop') || e.target.closest('.modal-close-btn')) {
    const openModals = document.querySelectorAll('.modal-backdrop.show');
    openModals.forEach(m => {
      m.classList.remove('show');
    });
    document.body.style.overflow = 'auto';
  }
});

// Toast notification helper
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `alert alert-${type}`;
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.zIndex = '9999';
  toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
  toast.style.minWidth = '280px';
  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:0.6rem;">
      <i class="fa-solid ${type === 'success' ? 'fa-circle-check' : 'fa-circle-info'}"></i>
      <span>${escapeHTML(message)}</span>
    </div>
  `;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// --- MULTILINGUAL CONTROLLER & GOOGLE TRANSLATE SYNC ---
function initLanguageSwitcher() {
  const KS_LANG_MAP = {
    en: { name: 'English', native: 'English', code: 'EN' },
    hi: { name: 'Hindi', native: 'हिन्दी', code: 'HI' },
    mr: { name: 'Marathi', native: 'मराठी', code: 'MR' },
    pa: { name: 'Punjabi', native: 'ਪੰਜਾਬੀ', code: 'PA' },
    gu: { name: 'Gujarati', native: 'ગુજરાતી', code: 'GU' },
    bn: { name: 'Bengali', native: 'বাংলা', code: 'BN' },
    te: { name: 'Telugu', native: 'తెలుగు', code: 'TE' },
    ta: { name: 'Tamil', native: 'தமிழ்', code: 'TA' }
  };

  // Detect current active language from cookie or localStorage
  function getActiveLanguage() {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([a-zA-Z\-]+)/);
    if (match && match[1]) {
      return match[1].toLowerCase();
    }
    const saved = localStorage.getItem('kisan_sahayak_lang');
    return saved || 'en';
  }

  // Update UI indicators (active badges, checks, button labels)
  function updateLanguageUI(langCode) {
    const info = KS_LANG_MAP[langCode] || KS_LANG_MAP.en;
    
    // Update desktop button label
    const labelEl = document.getElementById('langCurrentLabel');
    if (labelEl) {
      labelEl.textContent = info.native;
    }

    // Update desktop menu items
    document.querySelectorAll('.lang-menu-item, .lang-mini-btn').forEach(btn => {
      if (btn.dataset.lang === langCode) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update mobile chips
    document.querySelectorAll('.mobile-lang-chip').forEach(chip => {
      if (chip.dataset.lang === langCode) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    // Update mobile select
    const mobileSelect = document.getElementById('mobileLangSelect');
    if (mobileSelect) {
      if (['pa', 'gu', 'bn', 'te', 'ta'].includes(langCode)) {
        mobileSelect.value = langCode;
      } else {
        mobileSelect.value = '';
      }
    }
  }

  // Set cross-site and root cookies for Google Translate
  function setLanguageCookie(langCode) {
    const host = window.location.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';

    if (langCode === 'en') {
      document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      document.cookie = 'googtrans=/en/en; path=/;';
      if (!isLocal) {
        document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + host + ';';
        document.cookie = 'googtrans=/en/en; path=/; domain=' + host + ';';
        const parts = host.split('.');
        if (parts.length > 1) {
          const rootDomain = '.' + parts.slice(-2).join('.');
          document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=' + rootDomain + ';';
          document.cookie = 'googtrans=/en/en; path=/; domain=' + rootDomain + ';';
        }
      }
    } else {
      const val = '/en/' + langCode;
      document.cookie = 'googtrans=' + val + '; path=/; SameSite=Lax';
      if (!isLocal) {
        document.cookie = 'googtrans=' + val + '; path=/; domain=' + host + '; SameSite=Lax';
        const parts = host.split('.');
        if (parts.length > 1) {
          const rootDomain = '.' + parts.slice(-2).join('.');
          document.cookie = 'googtrans=' + val + '; path=/; domain=' + rootDomain + '; SameSite=Lax';
        }
      }
    }
  }

  // Switch language handler
  function changeLanguage(targetLang) {
    const current = getActiveLanguage();
    if (current === targetLang && targetLang !== 'en') {
      const menu = document.getElementById('langDropdownMenu');
      if (menu) menu.classList.remove('show');
      const toggle = document.getElementById('langToggleBtn');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      return;
    }

    localStorage.setItem('kisan_sahayak_lang', targetLang);
    setLanguageCookie(targetLang);
    updateLanguageUI(targetLang);

    // Close desktop dropdown
    const menu = document.getElementById('langDropdownMenu');
    if (menu) menu.classList.remove('show');
    const toggle = document.getElementById('langToggleBtn');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');

    // Trigger Google Translate Combo
    const combo = document.querySelector('.goog-te-combo');
    if (combo) {
      combo.value = targetLang;
      combo.dispatchEvent(new Event('change', { bubbles: true }));
      if (targetLang === 'en' || current !== 'en') {
        setTimeout(() => window.location.reload(), 150);
      }
    } else {
      window.location.reload();
    }
  }

  // Prevent Google Translate from shoving body down and hide banner frames
  function preventGoogleTranslateLayoutShift() {
    const purgeGoogleTranslateBar = () => {
      // 1. Reset body and html shifts
      if (document.body) {
        if (document.body.style.top && document.body.style.top !== '0px') {
          document.body.style.top = '0px';
        }
        if (document.body.style.position && document.body.style.position !== 'static') {
          document.body.style.position = 'static';
        }
      }
      if (document.documentElement && document.documentElement.style.top && document.documentElement.style.top !== '0px') {
        document.documentElement.style.top = '0px';
      }

      // 2. Hide / neutralize banner iframes and containers Google Translate injects into body
      const bannerSelectors = [
        '.goog-te-banner-frame',
        'iframe.skiptranslate',
        'iframe[id*=":"][id*="container"]',
        'iframe[src*="translate.google"]',
        '.VIpgJd-ZVi9od-ORHb-OEVmcd',
        '.VIpgJd-ZVi9od-ORHb-Oxf5Fd',
        'body > .skiptranslate:not(#google_translate_element)'
      ];

      bannerSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
          el.style.setProperty('display', 'none', 'important');
          el.style.setProperty('visibility', 'hidden', 'important');
          el.style.setProperty('height', '0px', 'important');
          el.style.setProperty('width', '0px', 'important');
          el.style.setProperty('opacity', '0', 'important');
          el.style.setProperty('pointer-events', 'none', 'important');
        });
      });
    };

    purgeGoogleTranslateBar();

    // Observe changes to style and added child nodes on body & html
    if (document.body) {
      const observer = new MutationObserver(() => {
        purgeGoogleTranslateBar();
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ['style', 'class'], childList: true });
      if (document.documentElement) {
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class'] });
      }
    }
  }

  // Setup desktop dropdown toggle
  const toggleBtn = document.getElementById('langToggleBtn');
  const dropdownMenu = document.getElementById('langDropdownMenu');

  if (toggleBtn && dropdownMenu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      toggleBtn.setAttribute('aria-expanded', String(!isExpanded));
      dropdownMenu.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('#langDropdownWrapper')) {
        dropdownMenu.classList.remove('show');
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Bind click handlers for all language options
  document.querySelectorAll('[data-lang]').forEach(el => {
    el.addEventListener('click', (e) => {
      const lang = el.dataset.lang;
      if (lang) {
        changeLanguage(lang);
      }
    });
  });

  // Bind mobile select change
  const mobileSelect = document.getElementById('mobileLangSelect');
  if (mobileSelect) {
    mobileSelect.addEventListener('change', (e) => {
      if (e.target.value) {
        changeLanguage(e.target.value);
      }
    });
  }

  // Initial UI state and layout shift guard
  const initialLang = getActiveLanguage();
  updateLanguageUI(initialLang);
  preventGoogleTranslateLayoutShift();
}
