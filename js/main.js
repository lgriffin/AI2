(function () {
  // dynamic year
  const y = document.getElementById('y');
  if (y) y.textContent = new Date().getFullYear();

  // ===== Theme Toggle =====
  (function themeToggle() {
    const desktopToggle = document.getElementById('theme-toggle');
    const mobileToggle = document.getElementById('mobile-theme-toggle');
    const desktopIcon = desktopToggle?.querySelector('.theme-icon');
    const mobileIcon = mobileToggle?.querySelector('.mobile-theme-icon');
    
    // Get stored theme or default to dark
    let currentTheme = localStorage.getItem('theme') || 'dark';

    // Apply theme
    function setTheme(theme) {
      console.log('Setting theme to:', theme);
      currentTheme = theme;
      
      // Set theme attribute - try multiple methods for mobile compatibility
      document.documentElement.setAttribute('data-theme', theme);
      document.documentElement.className = theme + '-theme';
      document.body.setAttribute('data-theme', theme);
      
      localStorage.setItem('theme', theme);
      
      // Update both icons
      const iconText = theme === 'dark' ? '🌙' : '☀️';
      if (desktopIcon) desktopIcon.textContent = iconText;
      if (mobileIcon) mobileIcon.textContent = iconText;
      
      // Update aria-labels
      const ariaText = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
      if (desktopToggle) desktopToggle.setAttribute('aria-label', ariaText);
      if (mobileToggle) mobileToggle.setAttribute('aria-label', ariaText);
      
      console.log('Theme applied:', theme);
    }

    // Initialize theme
    setTheme(currentTheme);

    // Theme toggle function
    function toggleTheme() {
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    }

    // Desktop theme toggle
    if (desktopToggle) {
      desktopToggle.addEventListener('click', toggleTheme);
      desktopToggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      });
    }

    // Mobile theme toggle with enhanced touch support
    if (mobileToggle) {
      // Multiple event types for better mobile support
      mobileToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      });
      
      mobileToggle.addEventListener('touchend', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleTheme();
      });
      
      mobileToggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggleTheme();
        }
      });
    }
  })();

  // ===== Events Loader with inline fallback =====
  (function loadEvents() {
    const container = document.getElementById('events-container') || document.getElementById('events-list');
    if (!container) return;

    const src = container.getAttribute('data-src') || 'data/events.json';

    fetch(src)
      .then(r => {
        if (!r.ok) throw new Error(`Failed to load ${src}: ${r.status}`);
        return r.json();
      })
      .then(renderList)
      .catch(() => {
        // Fallback to inline <script type="application/json" id="events-data">
        const inline = document.getElementById('events-data');
        if (inline) {
          try { renderList(JSON.parse(inline.textContent)); return; } catch {}
        }
        container.innerHTML = `<article class="card"><h3>Couldn’t load events</h3><p class="muted">Please try again later.</p></article>`;
      });

    function renderList(events) {
      if (!Array.isArray(events) || events.length === 0) {
        container.innerHTML = `<article class="card"><h3>No events yet</h3><p class="muted">Check back soon.</p></article>`;
        return;
      }
      container.innerHTML = events.map(renderEvent).join('');
    }
    function renderEvent(ev) {
      const { title='Untitled event', date='', time='', location='', description='', url='' } = ev || {};
      const meta = [date && `<strong>Date:</strong> ${esc(date)}`, time && `<strong>Time:</strong> ${esc(time)}`, location && `<strong>Venue:</strong> ${esc(location)}`]
        .filter(Boolean).join(' • ');
      const link = url ? `<p><a class="btn" href="${attr(url)}" target="_blank" rel="noopener">Details / RSVP</a></p>` : '';
      return `<article class="card">
        <h3>${esc(title)}</h3>
        ${meta ? `<p>${meta}</p>` : ''}
        ${description ? `<p class="muted">${esc(description)}</p>` : ''}
        ${link}
      </article>`;
    }
    function esc(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'","&#39;");}
    function attr(s){return esc(s).replaceAll('`','&#96;');}
  })();

  // ===== Carousel (with working prev/next) =====
  (function carousel() {
    const root = document.querySelector('.carousel');
    if (!root) return;

    const track = root.querySelector('.carousel-track');
    const slides = Array.from(root.querySelectorAll('.carousel-slide'));
    const prev = root.querySelector('.prev');
    const next = root.querySelector('.next');
    const viewport = root.querySelector('.carousel-viewport');

    let index = 0, timer = null;
    const interval = parseInt(root.getAttribute('data-autoplay') || '5000', 10);

    function go(i){ index = (i + slides.length) % slides.length; track.style.transform = `translateX(-${index * 100}%)`; }
    function start(){ stop(); timer = setInterval(()=>go(index+1), interval); }
    function stop(){ if (timer) clearInterval(timer); timer = null; }

    prev.addEventListener('click', ()=>{ go(index-1); start(); });
    next.addEventListener('click', ()=>{ go(index+1); start(); });

    [viewport, prev, next].forEach(el=>{
      el.addEventListener('mouseenter', stop);
      el.addEventListener('mouseleave', start);
      el.addEventListener('focusin', stop);
      el.addEventListener('focusout', start);
    });

    viewport.addEventListener('keydown', (e)=>{
      if (e.key === 'ArrowLeft') { go(index-1); start(); }
      if (e.key === 'ArrowRight') { go(index+1); start(); }
    });

    go(0); start();
  })();

  // ===== Contact form: AJAX submit to your backend, show thank-you =====
  (function contactForm() {
    const form = document.getElementById('contact-form');
    if (!form) return;

    const status = document.getElementById('contact-status');
    const thanks = document.getElementById('contact-success');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      status.textContent = 'Sending…';

      const formData = new FormData(form);
      const body = Object.fromEntries(formData.entries());

      try {
        const res = await fetch(form.action || '/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!res.ok) throw new Error(`Server responded ${res.status}`);
        status.textContent = '';
        thanks.style.display = 'block';
        form.reset();
      } catch (err) {
        console.error(err);
        status.textContent = 'Sorry — something went wrong. Please try again.';
      }
    });
  })();
})();
