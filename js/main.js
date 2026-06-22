/* NAV — scroll shadow + active link */
(function () {
  const nav = document.querySelector('nav.site-nav');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.style.background = window.scrollY > 40
      ? 'rgba(22, 9, 32, 0.97)'
      : 'linear-gradient(to bottom, rgba(22, 9, 32, 0.97) 0%, transparent 100%)';
  }, { passive: true });

  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-drawer a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
})();

/* MOBILE DRAWER — toggle open/close */
(function () {
  const toggle = document.getElementById('nav-toggle');
  const drawer = document.getElementById('mobile-drawer');
  if (!toggle || !drawer) return;

  toggle.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    toggle.classList.toggle('open', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  });

  drawer.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      drawer.classList.remove('open');
      toggle.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
})();

/* SCROLL REVEAL */
(function () {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) return;

  const style = document.createElement('style');
  style.textContent = `
    [data-reveal] {
      opacity: 0;
      transform: translateY(28px);
      transition: opacity 0.65s ease, transform 0.65s ease;
    }
    [data-reveal].revealed {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const delay = entry.target.dataset.delay || 0;
        setTimeout(() => entry.target.classList.add('revealed'), Number(delay));
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('[data-reveal]').forEach(el => io.observe(el));
})();

/* SKILL BARS */
(function () {
  const bars = document.querySelectorAll('.bar-fill');
  if (!bars.length) return;

  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const fill = entry.target;
      const target = fill.dataset.width;
      if (prefersReduced) {
        fill.style.width = target;
      } else {
        setTimeout(() => {
          fill.style.setProperty('--target-width', target);
          fill.classList.add('filled');
        }, 200);
      }
      io.unobserve(fill);
    });
  }, { threshold: 0.3 });

  bars.forEach(b => io.observe(b));
})();

/* PROJECT FILTER — show/hide cards by category */
(function () {
  const pills = document.querySelectorAll('.filter-pill');
  const cards = document.querySelectorAll('.project-card');
  const empty = document.getElementById('empty-state');
  if (!pills.length || !cards.length) return;

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      pills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');

      const filter = pill.dataset.filter;
      let visible = 0;

      cards.forEach(card => {
        const cats = (card.dataset.category || '').split(',').map(s => s.trim());
        const show = filter === 'all' || cats.includes(filter);
        card.style.display = show ? '' : 'none';
        if (show) visible++;
      });

      if (empty) empty.style.display = visible === 0 ? 'block' : 'none';
    });
  });
})();

/* HERO ORBS + STARS */
(function () {
  document.querySelectorAll('.hero-orb').forEach(orb => {
    const x = 10 + Math.random() * 80;
    const y = 10 + Math.random() * 80;
    const size = 200 + Math.random() * 300;
    orb.style.left = x + '%';
    orb.style.top = y + '%';
    orb.style.width = size + 'px';
    orb.style.height = size + 'px';
    orb.style.animationDelay = (Math.random() * 4) + 's';
    orb.style.animationDuration = (6 + Math.random() * 5) + 's';
  });

  document.querySelectorAll('.hero-star').forEach(star => {
    star.style.left = (Math.random() * 100) + '%';
    star.style.top = (Math.random() * 100) + '%';
    const s = 1 + Math.random() * 2;
    star.style.width = s + 'px';
    star.style.height = s + 'px';
    star.style.animationDelay = (Math.random() * 4) + 's';
    star.style.animationDuration = (3 + Math.random() * 4) + 's';
  });
})();

/* CURSOR — glowing pink sparkle trail + click burst */
(function () {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;';
  document.body.appendChild(canvas);

  const ctx      = canvas.getContext('2d');
  let W          = canvas.width  = window.innerWidth;
  let H          = canvas.height = window.innerHeight;
  let isDragging = false;
  const particles = [];

  window.addEventListener('resize', () => {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  });

  function Particle(x, y, isBurst) {
    this.x    = x;
    this.y    = y;
    this.size = isBurst ? 2 + Math.random() * 4 : 1 + Math.random() * 2.5;
    this.life = 1;
    this.decay = isBurst ? 0.018 + Math.random() * 0.025 : 0.028 + Math.random() * 0.02;

    const angle = Math.random() * Math.PI * 2;
    const speed = isBurst ? 1.5 + Math.random() * 4 : 0.3 + Math.random() * 1.2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed - (isBurst ? 0 : 0.4);

    const palette = ['#f472b6', '#e879f9', '#c084fc', '#f9a8d4', '#ffffff'];
    this.color = palette[Math.floor(Math.random() * palette.length)];
    this.isStar = Math.random() > 0.5;
  }

  Particle.prototype.update = function () {
    this.x   += this.vx;
    this.y   += this.vy;
    this.vy  += 0.06;
    this.life -= this.decay;
    this.size *= 0.97;
  };

  Particle.prototype.draw = function () {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);

    if (this.isStar) {
      ctx.translate(this.x, this.y);
      ctx.rotate(Date.now() * 0.002);
      ctx.fillStyle = this.color;
      ctx.shadowBlur  = 10;
      ctx.shadowColor = this.color;
      const s = this.size;
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2;
        ctx.lineTo(Math.cos(a) * s * 2.5, Math.sin(a) * s * 2.5);
        ctx.lineTo(Math.cos(a + Math.PI / 4) * s * 0.8, Math.sin(a + Math.PI / 4) * s * 0.8);
      }
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.shadowBlur  = 12;
      ctx.shadowColor = this.color;
      ctx.fillStyle   = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  };

  window.addEventListener('mousemove', (e) => {
    const count = isDragging ? 5 : 2;
    for (let i = 0; i < count; i++) {
      particles.push(new Particle(
        e.clientX + (Math.random() - 0.5) * 6,
        e.clientY + (Math.random() - 0.5) * 6,
        false
      ));
    }
  });

  window.addEventListener('click', (e) => {
    for (let i = 0; i < 22; i++) {
      particles.push(new Particle(e.clientX, e.clientY, true));
    }
  });

  window.addEventListener('mousedown', () => { isDragging = true; });
  window.addEventListener('mouseup',   () => { isDragging = false; });

  function loop() {
    ctx.clearRect(0, 0, W, H);
    for (let i = particles.length - 1; i >= 0; i--) {
      particles[i].update();
      particles[i].draw();
      if (particles[i].life <= 0 || particles[i].size < 0.2) {
        particles.splice(i, 1);
      }
    }
    requestAnimationFrame(loop);
  }

  loop();
})();