/* TOAST — show notification */
function showToast(message, type = 'info', duration = 3500) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '✦';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

/* SPINNER — show/hide loading state */
function showSpinner(container, message = 'Loading') {
  container.innerHTML = `
    <div class="spinner-wrap">
      <div class="spinner"></div>
      <p>${message}</p>
    </div>
  `;
}

function hideSpinner(container) {
  const wrap = container.querySelector('.spinner-wrap');
  if (wrap) wrap.remove();
}

/* FETCH PROJECTS — load from JSON */
async function fetchProjects() {
  const grid = document.getElementById('project-grid');
  const countEl = document.getElementById('search-count');
  if (!grid) return;

  showSpinner(grid, 'Fetching projects');

  try {
    const res = await fetch('data/projects.json');

    // Handle HTTP errors (404, 500, etc.)
    if (!res.ok) {
      throw new Error(`Server responded with ${res.status}`);
    }

    // Parse JSON
    const projects = await res.json();

    // Store globally for search to reuse
    window._allProjects = projects;

    renderProjects(projects, grid);
    if (countEl) countEl.textContent = `${projects.length} project${projects.length !== 1 ? 's' : ''}`;

    showToast('Projects loaded successfully', 'success');

  } catch (err) {
    grid.innerHTML = `
      <div class="fetch-error">
        <span class="script">Oops</span>
        <p>Could not load projects — ${err.message}</p>
        <button class="btn-outline" onclick="fetchProjects()">Try again</button>
      </div>
    `;
    showToast(`Failed to load projects: ${err.message}`, 'error');
  }
}

/* RENDER PROJECTS */
function renderProjects(projects, container) {
  if (!container) return;

  if (projects.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1;">
        <span class="script">Nothing here</span>
        <p>No projects match your search.</p>
      </div>
    `;
    return;
  }

  // Dynamically generate project card HTML from JSON keys
  container.innerHTML = projects.map(p => `
    <article class="project-card" data-category="${p.category}">
      <img src="${p.image}" alt="${p.title}" />
      <div class="overlay"></div>
      <div class="card-body">
        <div class="tag-row">
          ${p.tags.map(t => `<span>${t}</span>`).join('')}
        </div>
        <h3>${p.title}</h3>
        <div class="project-meta">
          <span>${p.category} &middot; ${p.year}</span>
          <span class="arrow">&#8599;</span>
        </div>
      </div>
    </article>
  `).join('');
}

/* LIVE SEARCH — filter projects without page reload */
function initLiveSearch() {
  const input   = document.getElementById('live-search');
  const grid    = document.getElementById('project-grid');
  const countEl = document.getElementById('search-count');
  if (!input || !grid) return;

  input.addEventListener('input', () => {
    const query    = input.value.trim().toLowerCase();
    const projects = window._allProjects || [];

    // Filter JSON data on every keypress
    const filtered = projects.filter(p => {
      return (
        p.title.toLowerCase().includes(query)       ||
        p.category.toLowerCase().includes(query)    ||
        p.description.toLowerCase().includes(query) ||
        p.stack.some(s => s.toLowerCase().includes(query))
      );
    });

    renderProjects(filtered, grid);

    if (countEl) {
      countEl.textContent = query
        ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''} for "${input.value.trim()}"`
        : `${projects.length} project${projects.length !== 1 ? 's' : ''}`;
    }
  });
}

/* FILTER PILLS — category filter */
function initFilterPills() {
  const pills   = document.querySelectorAll('.filter-pill');
  const grid    = document.getElementById('project-grid');
  const countEl = document.getElementById('search-count');
  if (!pills.length || !grid) return;

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      // Clear search input when filter pill is clicked
      const input = document.getElementById('live-search');
      if (input) input.value = '';

      const filter   = pill.dataset.filter;
      const projects = window._allProjects || [];

      const filtered = filter === 'all'
        ? projects
        : projects.filter(p => p.category === filter || p.tags.includes(filter));

      renderProjects(filtered, grid);

      if (countEl) {
        countEl.textContent = `${filtered.length} project${filtered.length !== 1 ? 's' : ''}`;
      }
    });
  });
}

/* CONTACT FORM — AJAX submit (no page reload) */
function initContactForm() {
  const form    = document.getElementById('contact-form');
  const confirm = document.getElementById('sent-confirm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear previous errors
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    form.querySelectorAll('input, textarea').forEach(el => el.style.borderColor = '');

    // Validate
    const fields = [
      { id: 'name',    msg: 'Name is required' },
      { id: 'email',   msg: 'A valid email is required' },
      { id: 'message', msg: 'Message is required' },
    ];

    let valid = true;
    fields.forEach(({ id, msg }) => {
      const el = document.getElementById(id);
      if (!el) return;
      const isEmpty      = !el.value.trim();
      const isInvalidEmail = id === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.value);
      if (isEmpty || isInvalidEmail) {
        el.style.borderColor = '#f472b6';
        const err = document.createElement('p');
        err.className = 'field-error';
        err.style.cssText = 'color:#f472b6;font-size:0.78rem;margin:4px 0 0;font-family:var(--font-label);';
        err.textContent = msg;
        el.parentElement.appendChild(err);
        valid = false;
      }
    });

    if (!valid) {
      showToast('Please fix the errors above', 'error');
      return;
    }

    // Show loading state on button
    const btn = form.querySelector('.submit-btn');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;"></div> Sending...';
    btn.disabled = true;

    // Real async POST to backend
    try {
      const payload = {
        name        : document.getElementById('name').value.trim(),
        email       : document.getElementById('email').value.trim(),
        project_type: document.getElementById('project-type')?.value || '',
        message     : document.getElementById('message').value.trim(),
      };

      const res  = await fetch('/api/contact', {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        // Server-side validation errors or 500
        const errMsg = data.errors ? data.errors.join(' ') : (data.error || 'Something went wrong.');
        throw new Error(errMsg);
      }

      // Success — fade out form, show confirmation
      form.style.transition = 'opacity 0.4s ease';
      form.style.opacity = '0';
      setTimeout(() => {
        form.style.display = 'none';
        if (confirm) {
          confirm.style.display = 'block';
          confirm.style.opacity = '0';
          confirm.style.transition = 'opacity 0.4s ease';
          requestAnimationFrame(() => { confirm.style.opacity = '1'; });
        }
      }, 400);

      showToast('Message sent successfully!', 'success');

    } catch (err) {
      btn.innerHTML = originalText;
      btn.disabled = false;
      showToast(err.message || 'Failed to send message. Please try again.', 'error');
    }
  });
}

/* INIT */
document.addEventListener('DOMContentLoaded', () => {
  // Work page — fetch + search + filter
  if (document.getElementById('project-grid')) {
    fetchProjects().then(() => {
      initLiveSearch();
      initFilterPills();
    });
  }

  // Contact page — AJAX form
  if (document.getElementById('contact-form')) {
    initContactForm();
  }
});