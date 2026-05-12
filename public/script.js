/* ══════════════════════════════════════════
   NAV SCROLL + BURGER
══════════════════════════════════════════ */
const navbar  = document.getElementById('navbar');
const burger  = document.getElementById('burger');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

burger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

// Fermer menu mobile au clic sur lien
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* ══════════════════════════════════════════
   SCRAMBLE NAVIGATION (survol / focus)
══════════════════════════════════════════ */
(() => {
  const links = document.querySelectorAll('.nav-links a');
  if (!links.length) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-=?';
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const revealScramble = (el, durationMs = 650) => {
    if (el.dataset.noScramble === '1') return;
    const finalText = (el.dataset.scrambleText ?? el.textContent).trim();
    el.dataset.scrambleText = finalText;
    if (!finalText) return;
    if (el.dataset.scrambling === '1') return;
    el.dataset.scrambling = '1';

    const start = performance.now();
    const chars = finalText.split('');
    const len = chars.length;

    const tick = (now) => {
      const t = now - start;
      const p = clamp(t / durationMs, 0, 1);

      const out = chars.map((ch, i) => {
        if (ch === ' ') return ' ';
        if (i / Math.max(1, len - 1) < p) return ch;
        return SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
      }).join('');

      el.textContent = out;

      if (t >= durationMs) {
        el.textContent = finalText;
        el.dataset.scrambling = '0';
        return;
      }

      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  links.forEach(link => {
    link.addEventListener('mouseenter', () => revealScramble(link));
    link.addEventListener('focus', () => revealScramble(link));
  });

  // Appliquer le même effet scramble sur tous les boutons/CTA
  const buttons = document.querySelectorAll('button, .btn, .skills-nav-btn');
  buttons.forEach(btn => {
    btn.addEventListener('mouseenter', () => revealScramble(btn));
    btn.addEventListener('focus', () => revealScramble(btn));
  });
})();

/* ══════════════════════════════════════════
   TERMINAL GATE (ACCUEIL) - confirmation + countdown
══════════════════════════════════════════ */
(() => {
  const gate = document.getElementById('terminalGate');
  const linesEl = document.getElementById('terminalLines');
  const cursorHint = gate ? gate.querySelector('.terminal-cursor') : null;
  const yesBtn = document.getElementById('terminalYes');
  const noBtn = document.getElementById('terminalNo');
  const countdownEl = document.getElementById('terminalCountdown');
  const screenEl = gate ? gate.querySelector('.terminal-screen') : null;
  const controlsEl = gate ? gate.querySelector('.terminal-controls') : null;

  if (!gate || !linesEl || !yesBtn || !noBtn || !countdownEl || !screenEl) return;

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.__terminalGateActive = true;
  document.body.style.overflow = 'hidden';

  const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%&*+-=?';
  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    let terminalRunToken = 0;
    let conversationSoFar = '';

  const showTerminalText = (text, opts = {}) => {
    const fullText = String(text ?? '');
    const append = opts.append === true;
    const baseText = append ? conversationSoFar : '';
    if (!append) linesEl.textContent = '';
    else linesEl.textContent = baseText;
    if (cursorHint) cursorHint.style.display = '';
    screenEl.style.display = '';
    countdownEl.style.display = 'none';

    terminalRunToken += 1;
    const token = terminalRunToken;

    if (reduceMotion) {
      const append = opts.append === true;
      const baseText = append ? conversationSoFar : '';
      linesEl.textContent = baseText + fullText;
      conversationSoFar = append ? (baseText + fullText) : fullText;
      if (append && screenEl) screenEl.scrollTop = screenEl.scrollHeight;
      return 0;
    }

    const mode = opts.mode || 'full';
    const scrollDuringNoise = opts.scrollDuringNoise ?? (mode === 'full');
    if (!scrollDuringNoise) screenEl.scrollTop = 0;

    // Phases : scramble lettre-par-lettre -> bruit rapide -> freeze+flicker -> scramble rapide final -> texte correct
    const SCRAMBLE_CHARS_LOCAL = SCRAMBLE_CHARS;
    const randomChar = () => SCRAMBLE_CHARS_LOCAL[Math.floor(Math.random() * SCRAMBLE_CHARS_LOCAL.length)];
    const charArr = Array.from(fullText);
    const len = charArr.length;

    const activeIndices = [];
    for (let i = 0; i < len; i += 1) {
      const ch = charArr[i];
      if (ch === '\n' || ch === ' ') continue; // garde les sauts de ligne & espaces
      activeIndices.push(i);
    }

    // Durées
    // - full : cinématique complète bruit + crash
    // - fast : cinématique raccourcie
    // - conversation : pas de "gros bruit", uniquement reveal scramble lettre-par-lettre
    // - durationMs : override (utile pour "4 sec par question")
    const noiseMs = mode === 'conversation' ? 0 : (mode === 'fast' ? 650 : 2000);
    const flickerMs = mode === 'conversation' ? 0 : (mode === 'fast' ? 140 : 260);
    const postMs = mode === 'conversation' ? 0 : (mode === 'fast' ? 180 : 320);
    const buildMsDefault = mode === 'conversation' ? 820 : (mode === 'fast' ? 520 : 1200);
    const buildMs = typeof opts.durationMs === 'number' ? Math.max(0, opts.durationMs) : buildMsDefault;
    const holdMs = typeof opts.holdMs === 'number' ? Math.max(0, opts.holdMs) : 0;
    const totalMs = noiseMs + buildMs + flickerMs + postMs + holdMs;

    // Dévoilement progressif (décalage entre chaque lettre) pendant build
    const buildStagger = buildMs / Math.max(1, activeIndices.length);
    const buildRevealAt = new Array(len).fill(Infinity);
    activeIndices.forEach((i, k) => {
      const jitter = buildStagger * 0.35 * Math.random();
      buildRevealAt[i] = k * buildStagger + jitter;
    });

    // Dévoilement progressif final pendant post
    const postStagger = postMs / Math.max(1, activeIndices.length);
    const postRevealAt = new Array(len).fill(Infinity);
    activeIndices.forEach((i, k) => {
      const jitter = postStagger * 0.45 * Math.random();
      postRevealAt[i] = k * postStagger + jitter;
    });

    // Etat bruit (plus de longueur pour remplir l'écran)
    const fontSizePx = parseFloat(getComputedStyle(linesEl).fontSize || '14') || 14;
    const approxCharPx = Math.max(6, Math.round(fontSizePx * 0.62));
    // Longueur de ligne (largeur) : on garde un rendu "plein écran" sans étirer trop horizontalement
    const noiseLineLen = clamp(
      Math.floor((screenEl.clientWidth || window.innerWidth) / approxCharPx),
      50,
      130
    );
    // Longueur verticale (hauteur) : plus de lignes accumulées
    const noiseLineCount = 14;
    const lineIntervalMs = 35;
    let noiseStarted = false;
    let lastNoiseEmitAt = -Infinity;
    let noiseLines = [];

    let crashStarted = false;
    let postStarted = false;

    // Throttle : évite de surcharger le navigateur (surtout en bruit)
    const minRenderMs = 35;
    let lastRenderAt = 0;

    const tick = (now) => {
      if (token !== terminalRunToken) return;
      const elapsed = now - start;

      if (now - lastRenderAt < minRenderMs) {
        requestAnimationFrame(tick);
        return;
      }
      lastRenderAt = now;

      if (!noiseStarted && elapsed >= 0) {
        noiseStarted = true;
        noiseLines = [];
        // Initiale : quelques lignes direct
        for (let n = 0; n < noiseLineCount; n += 1) {
          let line = '';
          for (let j = 0; j < noiseLineLen; j += 1) line += randomChar();
          noiseLines.push(line);
        }
        lastNoiseEmitAt = 0;
      }

      if (elapsed < noiseMs) {
        // Bruit qui défile très vite (lignes s'accumulent) dès le début
        const due = elapsed - lastNoiseEmitAt;
        const steps = lineIntervalMs > 0 ? Math.floor(due / lineIntervalMs) : 0;
        const maxEmitPerTick = 4;
        const emitCount = clamp(steps, 0, maxEmitPerTick);
        for (let k = 0; k < emitCount; k += 1) {
          lastNoiseEmitAt += lineIntervalMs;
          let line = '';
          for (let j = 0; j < noiseLineLen; j += 1) line += randomChar();
          noiseLines.push(line);
          if (noiseLines.length > noiseLineCount) noiseLines.shift();
        }
        linesEl.textContent = baseText + noiseLines.join('\n');
        if (scrollDuringNoise && screenEl) screenEl.scrollTop = screenEl.scrollHeight;
      } else if (elapsed < noiseMs + buildMs) {
        const buildElapsed = elapsed - noiseMs;
        const out = charArr.map((ch, i) => {
          if (ch === '\n') return '\n';
          if (ch === ' ') return ' ';
          if (buildElapsed >= buildRevealAt[i]) return ch;
          return randomChar();
        });
        linesEl.textContent = baseText + out.join('');
        // Pas d'auto-scroll pendant le build (défilement seulement au début)
      } else if (elapsed < noiseMs + buildMs + flickerMs) {
        // Freeze + flicker : on ne modifie pas le texte, on secoue l'écran
        if (!crashStarted) {
          crashStarted = true;
          screenEl.classList.add('terminal-crash');
        }
      } else if (elapsed < totalMs) {
        // Post scramble : on retire l'animation crash puis on reconstruit vers le bon texte
        if (!postStarted) {
          postStarted = true;
          screenEl.classList.remove('terminal-crash');
        }

        const postElapsed = elapsed - (noiseMs + buildMs + flickerMs);
        const out = charArr.map((ch, i) => {
          if (ch === '\n') return '\n';
          if (ch === ' ') return ' ';
          if (postElapsed >= postRevealAt[i]) return ch;
          return randomChar();
        });
        linesEl.textContent = baseText + out.join('');
        // Pas d'auto-scroll pendant les étapes crash/post
      } else if (elapsed < totalMs) {
        // Hold : texte stable (permet "scramble 1s" mais question 4s)
        screenEl.classList.remove('terminal-crash');
        linesEl.textContent = baseText + fullText;
      } else {
        screenEl.classList.remove('terminal-crash');
        linesEl.textContent = baseText + fullText;
        conversationSoFar = append ? (baseText + fullText) : fullText;
        if (append && screenEl) screenEl.scrollTop = screenEl.scrollHeight;
        // Pas d'auto-scroll final (on garde la position)
        return;
      }

      requestAnimationFrame(tick);
    };

    const start = performance.now();
    requestAnimationFrame(tick);

    return totalMs;
  };

  const hideGate = () => {
    gate.classList.add('hidden');
    window.__terminalGateActive = false;
    document.body.style.overflow = '';
  };

  let stage = 0; // 0 = cliquer ici, 1 = êtes-vous sur, 2 = vraiment sur
  let autoToken = 0;

  const runExchange = (systemText, youText, nextFn, opts = {}) => {
    const myToken = autoToken;
    // 4s pour chaque question (SYSTEM)
    const msQ = showTerminalText(systemText, {
      mode: 'conversation',
      scrollDuringNoise: false,
      durationMs: 1000, // scramble 1s
      holdMs: 2400,     // un peu plus rapide
      append: true,
    });
    setTimeout(() => {
      if (myToken !== autoToken || !window.__terminalGateActive) return;
      const msA = showTerminalText(youText, {
        mode: 'conversation',
        scrollDuringNoise: false,
        durationMs: 750, // réponse un peu plus rapide
        holdMs: 0,
        append: true,
      });
      setTimeout(() => {
        if (myToken !== autoToken || !window.__terminalGateActive) return;
        const extraDelayMs = typeof opts.extraDelayMs === 'number' ? opts.extraDelayMs : 0;
        setTimeout(() => {
          if (myToken !== autoToken || !window.__terminalGateActive) return;
          if (typeof nextFn === 'function') nextFn();
        }, extraDelayMs);
      }, (msA || 0) + 80);
    }, (msQ || 0) + 80);
  };

  const toStage0 = () => {
    autoToken += 1;
    gate.classList.remove('terminal-stage2');
    // Direct : décompte + lancement (pas de texte)
    startCountdown();
  };

  const toStage1 = () => {
    stage = 1;
    autoToken += 1;
    yesBtn.disabled = true;
    noBtn.disabled = true;
    gate.classList.remove('terminal-stage2');
    if (controlsEl) controlsEl.style.display = 'none';

    runExchange(
      '#SYSTEM ETES_VOUS_SUR_DE_VOULOIR_VISUALISER_LE_SITE ?\n',
      '#VOUS OK\n',
      () => toStage2()
    );
  };

  const toStage2 = () => {
    stage = 2;
    autoToken += 1;
    yesBtn.disabled = true;
    noBtn.disabled = true;
    gate.classList.add('terminal-stage2');
    if (controlsEl) controlsEl.style.display = 'none';

    runExchange(
      '#SYSTEM ETES_VOUS_VRAIMENT_SUR ?\n',
      '#VOUS OUI_JE_SUIS_VRAIMENT_SUR\n',
      () => startCountdown(),
      { extraDelayMs: 1000 } // +1s avant le décompte
    );
  };

  const startCountdown = () => {
    yesBtn.disabled = true;
    noBtn.disabled = true;
    yesBtn.style.opacity = '0.7';
    noBtn.style.opacity = '0.7';

    screenEl.style.display = 'none';
    if (controlsEl) controlsEl.style.display = 'none';
    countdownEl.style.display = 'flex';

    if (reduceMotion) {
      countdownEl.textContent = 'LANCEMENT...';
      setTimeout(() => hideGate(), 450);
      return;
    }

    const nums = ['3', '2', '1'];
    countdownEl.textContent = nums[0];
    let idx = 0;

    const tick = () => {
      idx += 1;
      if (idx < nums.length) {
        countdownEl.textContent = nums[idx];
        setTimeout(tick, 900);
      } else {
        countdownEl.textContent = 'LANCEMENT...';
        setTimeout(hideGate, 650);
      }
    };

    setTimeout(tick, 900);
  };

  const onYes = () => {
    autoToken += 1;
    return startCountdown();
  };

  const onNo = () => {
    autoToken += 1;
    return startCountdown();
  };

  // Pause des interactions clavier pendant le gate
  document.addEventListener('keydown', (e) => {
    if (!window.__terminalGateActive) return;
    const keysToIgnore = ['Tab', 'Enter', ' '];
    // Permet d'activer les boutons avec Entrée/Espace
    if (keysToIgnore.includes(e.key)) return;
    e.preventDefault();
    e.stopPropagation();
  }, true);

  yesBtn.addEventListener('click', onYes);
  noBtn.addEventListener('click', onNo);

  toStage0();
})();

/* ══════════════════════════════════════════
   REVEAL ON SCROLL
══════════════════════════════════════════ */
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      // Animer les barres de compétences
      const bars = entry.target.querySelectorAll('.skill-bar');
      bars.forEach(bar => {
        const item = bar.closest('.skill-item');
        const level = item ? item.dataset.level : 0;
        setTimeout(() => { bar.style.width = level + '%'; }, 100);
      });
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// Barres compétences dans les blocs déjà visibles au chargement
window.addEventListener('load', () => {
  document.querySelectorAll('.skill-item').forEach(item => {
    const bar = item.querySelector('.skill-bar');
    if (bar && item.closest('.visible')) {
      bar.style.width = item.dataset.level + '%';
    }
  });
});

/* ══════════════════════════════════════════
   CARROUSEL COMPETENCES
══════════════════════════════════════════ */
const skillsTrack = document.getElementById('skillsTrack');
const skillsPrev = document.getElementById('skillsPrev');
const skillsNext = document.getElementById('skillsNext');
const skillsDotsWrap = document.getElementById('skillsDots');

if (skillsTrack && skillsPrev && skillsNext && skillsDotsWrap) {
  const slides = Array.from(skillsTrack.querySelectorAll('.skills-block'));
  const dots = Array.from(skillsDotsWrap.querySelectorAll('.skills-dot'));
  const skillsViewport = skillsTrack.closest('.skills-viewport');
  let currentIndex = 0;
  let touchStartX = 0;
  let touchEndX = 0;
  let pixelTimer = null;

  const animateBarsForSlide = (slideEl) => {
    if (!slideEl) return;
    slideEl.querySelectorAll('.skill-item').forEach(item => {
      const bar = item.querySelector('.skill-bar');
      if (!bar) return;
      bar.style.width = item.dataset.level + '%';
    });
  };

  const updateSkillsCarousel = () => {
    const offset = currentIndex * 100;
    skillsTrack.style.transform = `translateX(-${offset}%)`;
    dots.forEach((dot, idx) => dot.classList.toggle('active', idx === currentIndex));
    animateBarsForSlide(slides[currentIndex]);
    if (skillsViewport) {
      skillsViewport.classList.remove('pixel-swipe');
      void skillsViewport.offsetWidth; // relance l'animation CSS
      skillsViewport.classList.add('pixel-swipe');
      clearTimeout(pixelTimer);
      pixelTimer = setTimeout(() => skillsViewport.classList.remove('pixel-swipe'), 450);
    }
  };

  skillsPrev.addEventListener('click', () => {
    currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    updateSkillsCarousel();
  });

  skillsNext.addEventListener('click', () => {
    currentIndex = (currentIndex + 1) % slides.length;
    updateSkillsCarousel();
  });

  dots.forEach(dot => {
    dot.addEventListener('click', () => {
      currentIndex = Number(dot.dataset.index) || 0;
      updateSkillsCarousel();
    });
  });

  skillsTrack.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].clientX;
  }, { passive: true });

  skillsTrack.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].clientX;
    const delta = touchEndX - touchStartX;
    if (Math.abs(delta) < 45) return;
    if (delta < 0) {
      currentIndex = (currentIndex + 1) % slides.length;
    } else {
      currentIndex = (currentIndex - 1 + slides.length) % slides.length;
    }
    updateSkillsCarousel();
  }, { passive: true });

  updateSkillsCarousel();
}

/* ══════════════════════════════════════════
   ACTIVE NAV LINK
══════════════════════════════════════════ */
const sections = document.querySelectorAll('section[id]');
const navLinkEls = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(sec => {
    if (window.scrollY >= sec.offsetTop - 120) current = sec.id;
  });
  navLinkEls.forEach(a => {
    a.style.color = a.getAttribute('href') === '#' + current ? 'var(--accent)' : '';
  });
});

/* ══════════════════════════════════════════
   FORMULAIRE CONTACT
══════════════════════════════════════════ */
const form     = document.getElementById('contactForm');
const feedback = document.getElementById('formFeedback');
const btnText  = document.getElementById('btnText');
const submitBtn = document.getElementById('submitBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  btnText.textContent = 'Envoi en cours...';
  feedback.textContent = '';
  feedback.className = 'form-feedback';

  const data = {
    name:    form.name.value.trim(),
    email:   form.email.value.trim(),
    message: form.message.value.trim(),
  };

  try {
    const res = await fetch('/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (json.success) {
      feedback.textContent = '✓ Message envoyé avec succès !';
      feedback.classList.add('success');
      form.reset();
    } else {
      throw new Error();
    }
  } catch {
    feedback.textContent = '✗ Une erreur est survenue. Contactez-moi directement par email.';
    feedback.classList.add('error');
  } finally {
    submitBtn.disabled = false;
    btnText.textContent = 'Envoyer le message';
  }
});

/* ══════════════════════════════════════════
   TYPING EFFECT NOM
══════════════════════════════════════════ */
// Petit effet de soulignement progressif sous le titre
const heroName = document.querySelector('.hero-name');
if (heroName) {
  heroName.style.opacity = '0';
  setTimeout(() => {
    heroName.style.transition = 'opacity .5s ease';
    heroName.style.opacity = '1';
  }, 350);
}

/* ══════════════════════════════════════════
   SMOOTH ANCHOR
══════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* ══════════════════════════════════════════
   PDF E5 : vérifier le fichier
══════════════════════════════════════════ */
const e5PdfLink = document.getElementById('e5PdfLink');
if (e5PdfLink) {
  const pdfHref = e5PdfLink.getAttribute('href');
  fetch(pdfHref, { method: 'HEAD' })
    .then(res => {
      const contentType = res.headers.get('content-type') || '';
      const isPdf = res.ok && contentType.includes('application/pdf');
      if (!isPdf) {
        e5PdfLink.textContent = 'PDF E5 à ajouter';
        e5PdfLink.setAttribute('aria-disabled', 'true');
        e5PdfLink.style.pointerEvents = 'none';
        e5PdfLink.style.opacity = '0.65';
      }
    })
    .catch(() => {
      e5PdfLink.textContent = 'PDF E5 à ajouter';
      e5PdfLink.setAttribute('aria-disabled', 'true');
      e5PdfLink.style.pointerEvents = 'none';
      e5PdfLink.style.opacity = '0.65';
    });
}

/* ══════════════════════════════════════════
   MATRIX EFFECT (HERO)
══════════════════════════════════════════ */
const matrixCanvas = document.getElementById('matrixCanvas');
if (matrixCanvas && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const ctx = matrixCanvas.getContext('2d');
  const charset = '01アイウエオカキクケコサシスセソﾊﾐﾑﾒﾓABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const fontSize = 14;
  let cols = 0;
  let drops = [];
  let rafId = null;
  // Ralentit l'animation (chute + fréquence de rafraîchissement)
  const dropSpeed = 0.35; // avant: 0.75 (plus lent)
  const frameIntervalMs = 60; // avant: ~16ms (60fps). 60ms => ~16fps

  const fitCanvas = () => {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = matrixCanvas.getBoundingClientRect();
    matrixCanvas.width = Math.floor(rect.width * ratio);
    matrixCanvas.height = Math.floor(rect.height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    cols = Math.floor(rect.width / fontSize);
    drops = Array.from({ length: cols }, () => Math.random() * (rect.height / fontSize));
  };

  let lastFrameTs = 0;
  const draw = (ts) => {
    if (!ts) ts = 0;
    if (ts - lastFrameTs < frameIntervalMs) {
      rafId = requestAnimationFrame(draw);
      return;
    }
    lastFrameTs = ts;

    const w = matrixCanvas.clientWidth;
    const h = matrixCanvas.clientHeight;
    ctx.fillStyle = 'rgba(8, 12, 18, 0.08)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#39ff14';
    ctx.font = `${fontSize}px monospace`;

    for (let i = 0; i < drops.length; i += 1) {
      const char = charset[Math.floor(Math.random() * charset.length)];
      const x = i * fontSize;
      const y = drops[i] * fontSize;
      ctx.fillText(char, x, y);
      if (y > h && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i] += dropSpeed;
    }
    rafId = requestAnimationFrame(draw);
  };

  fitCanvas();
  draw();
  window.addEventListener('resize', fitCanvas);
  window.addEventListener('beforeunload', () => {
    if (rafId) cancelAnimationFrame(rafId);
  });
}

/* ══════════════════════════════════════════
   DETAILS PROJETS (MODAL + README)
══════════════════════════════════════════ */
const projectDetails = {
  "unityddt": {
    title: "Convertisseur XSY -> JSON",
    subtitle: "Automates industriels (DDT)",
    desc: "Outil de conversion de fichiers techniques pour uniformiser les donnees d'automates en JSON exploitable.",
    points: [
      "Parsing des fichiers d'entree et normalisation du schema de sortie",
      "Filtrage des champs pour respecter les contraintes DDT",
      "Sortie stable pour simplifier l'integration cote logiciel industriel"
    ],
    stack: "Python, JSON, Parsing"
  },
  "chronova": {
    title: "Chronova",
    subtitle: "Application RH - Projets & Taches",
    desc: "Application RH permettant de piloter projets, taches et affectations avec gestion des roles.",
    points: [
      "Gestion d'authentification et roles utilisateurs",
      "CRUD projets/taches avec persistance SQL",
      "Structuration backend pour une maintenance evolutive"
    ],
    stack: "Node.js, TypeScript, PostgreSQL, Prisma, JWT"
  },
  "encosyst-website": {
    title: "Encosyst Website",
    subtitle: "Site institutionnel multilingue",
    desc: "Site vitrine multilingue avec selection de langue, persistance locale et animations.",
    points: [
      "Mise en place d'une structure i18n simple et maintainable",
      "Experience utilisateur fluide avec animations front-end",
      "Deploiement web statique optimisable"
    ],
    stack: "HTML, CSS, JavaScript, i18n"
  },
  "inherit-api": {
    title: "API REST Securisee",
    subtitle: "Architecture backend complete",
    desc: "Projet backend autour d'une API structuree avec logique metier et securisation des acces.",
    points: [
      "Organisation controller/service/repository",
      "Validation et controle des donnees d'entree",
      "Preparation a la documentation et a l'integration front"
    ],
    stack: "Node.js, TypeScript, Express, JWT"
  },
  "rickandmorty": {
    title: "rickandMorty",
    subtitle: "Application web API",
    desc: "Projet front-end de consultation de donnees API avec filtres et affichage dynamique.",
    points: [
      "Requetes API et gestion des etats de chargement",
      "Filtrage/recherche dans les donnees",
      "Interface responsive et navigation simple"
    ],
    stack: "JavaScript, API, Frontend"
  },
  "street-bites": {
    title: "Street_bites",
    subtitle: "Plateforme food & decouverte",
    desc: "Application orientee utilisateur pour explorer des adresses et contenus food.",
    points: [
      "Modele de donnees pour fiches/categorie",
      "Navigation orientee experience utilisateur",
      "Architecture evolutive pour ajouter des modules"
    ],
    stack: "Node.js, Express, SQL"
  },
  "spotilike": {
    title: "Spotilike",
    subtitle: "Recommandation musicale",
    desc: "Projet inspire des plateformes de streaming avec gestion de playlists et suggestions.",
    points: [
      "Logique de recommandation de contenus",
      "Manipulation de donnees musicales/API",
      "Interface moderne orientee usage quotidien"
    ],
    stack: "TypeScript, API, PostgreSQL"
  },
  "calendar": {
    title: "Calendar",
    subtitle: "Organisation & planification",
    desc: "Application de planification d'evenements/taches pour une meilleure gestion du temps.",
    points: [
      "Creation et edition d'evenements",
      "Vue calendrier et lisibilite des priorites",
      "Base solide pour evolutions (rappels, partage, etc.)"
    ],
    stack: "JavaScript, Frontend, Productivite"
  }
};

const projectModal = document.getElementById('projectModal');
const projectModalOverlay = document.getElementById('projectModalOverlay');
const projectModalClose = document.getElementById('projectModalClose');
const projectModalTitle = document.getElementById('projectModalTitle');
const projectModalSubtitle = document.getElementById('projectModalSubtitle');
const projectModalImage = document.getElementById('projectModalImage');
const projectModalDesc = document.getElementById('projectModalDesc');
const projectModalPoints = document.getElementById('projectModalPoints');
const projectModalStack = document.getElementById('projectModalStack');
const projectModalRepoLink = document.getElementById('projectModalRepoLink');
const projectModalReadme = document.getElementById('projectModalReadme');

const closeProjectModal = () => {
  if (!projectModal) return;
  projectModal.classList.remove('open');
  projectModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
};

const decodeBase64Utf8 = (base64) => {
  const binary = atob(base64);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
};

const openProjectModal = async (card) => {
  if (!projectModal) return;
  const projectId = card.dataset.projectId;
  const repo = card.dataset.repo;
  const data = projectDetails[projectId];
  if (!data || !repo) return;

  projectModalTitle.textContent = data.title;
  projectModalSubtitle.textContent = data.subtitle;
  projectModalDesc.textContent = data.desc;
  projectModalStack.textContent = data.stack;
  projectModalRepoLink.href = `https://github.com/${repo}`;
  projectModalPoints.innerHTML = '';
  data.points.forEach(point => {
    const li = document.createElement('li');
    li.textContent = point;
    projectModalPoints.appendChild(li);
  });

  projectModalImage.src = `https://opengraph.githubassets.com/1/${repo}`;
  projectModalImage.style.display = 'block';
  projectModalImage.onerror = () => {
    projectModalImage.style.display = 'none';
  };

  projectModalReadme.textContent = 'Chargement du README...';
  projectModal.classList.add('open');
  projectModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/readme`);
    if (!res.ok) {
      throw new Error('README indisponible');
    }
    const json = await res.json();
    const raw = decodeBase64Utf8(json.content || '');
    projectModalReadme.textContent = raw.slice(0, 7000) + (raw.length > 7000 ? '\n\n... (tronque)' : '');
  } catch {
    projectModalReadme.textContent = 'README non disponible automatiquement. Utilise le lien GitHub ci-dessus.';
  }
};

document.querySelectorAll('.js-project-card').forEach(card => {
  card.addEventListener('click', (e) => {
    if (e.target.closest('.project-links a')) return;
    openProjectModal(card);
  });
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openProjectModal(card);
    }
  });
});

if (projectModalOverlay) projectModalOverlay.addEventListener('click', closeProjectModal);
if (projectModalClose) projectModalClose.addEventListener('click', closeProjectModal);
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeProjectModal();
});

/* ══════════════════════════════════════════
   MINI GAME : PACMAN-LIKE (parcours -> projets)
══════════════════════════════════════════ */
(() => {
  const canvas = document.getElementById('pacmanCanvas');
  const parcoursEl = document.getElementById('parcours');
  const projetsEl = document.getElementById('projets');
  if (!canvas || !parcoursEl || !projetsEl) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist2 = (ax, ay, bx, by) => {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy;
  };

  const DPR = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  let w = 0;
  let h = 0;
  let gameStartY = 0; // coord doc (px)
  let gameEndY = 0;   // coord doc (px)
  let gameHeight = 1;

  let lastBoundsUpdate = 0;
  let scrollActive = false;

  const recalcBounds = () => {
    const a = parcoursEl.getBoundingClientRect();
    const b = projetsEl.getBoundingClientRect();
    gameStartY = a.top + window.scrollY;
    gameEndY = b.bottom + window.scrollY;
    gameHeight = Math.max(1, gameEndY - gameStartY);
  };

  const resize = () => {
    w = canvas.clientWidth || window.innerWidth;
    h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    recalcBounds();
    resetWorld();
  };

  // World state (coords normalisées xN,yN dans [0..1] vertical entre startY..endY)
  const PAC_RADIUS = 19.5; // 1.5x plus grand
  const GHOST_RADIUS = 14;
  const BULLET_RADIUS = 3;

  let score = 0;
  let pellets = [];
  let ghosts = [];
  let pac = null;
  let bullets = [];
  let mouse = { x: 0, y: 0 };
  let lastShotAt = 0;

  const pelletCount = () => {
    // densite ajustee selon taille de viewport
    const base = 26;
    return Math.round(base * (window.innerWidth / 1000) * (window.innerHeight / 700));
  };

  const spawnPellet = () => ({
    xN: Math.random(),
    yN: Math.random(),
  });

  const spawnGhost = () => {
    // direction initiale aleatoire (unit vector)
    const ang = rand(0, Math.PI * 2);
    const speed = rand(28, 44); // pixels/sec (en coord screen)
    return {
      xN: Math.random(),
      yN: Math.random(),
      vx: Math.cos(ang),
      vy: Math.sin(ang),
      speed,
      eatenAt: 0,
      respawnAt: 0,
      hue: rand(140, 230),
    };
  };

  const resetWorld = () => {
    score = 0;
    pellets = Array.from({ length: clamp(pelletCount(), 14, 60) }, spawnPellet);
    bullets = [];

    pac = {
      xN: 0.25 + Math.random() * 0.5,
      yN: 0.25,
      dirX: 1,
      dirY: 0,
      speed: 110, // px/sec
    };

    ghosts = Array.from({ length: 7 }, spawnGhost);
  };

  const updateMouse = (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  };

  const shoot = () => {
    if (window.__terminalGateActive) return;
    if (!scrollActive) return;
    if (!pac) return;

    const now = performance.now();
    const cooldownMs = 140;
    if (now - lastShotAt < cooldownMs) return;
    lastShotAt = now;

    const pacX = pac.xN * w;
    const pacY = (gameStartY + pac.yN * gameHeight) - window.scrollY;

    const dx = mouse.x - pacX;
    const dy = mouse.y - pacY;
    const len = Math.hypot(dx, dy) || 1;
    const vx = dx / len;
    const vy = dy / len;

    bullets.push({
      x: pacX,
      y: pacY,
      vx,
      vy,
      speed: 520, // px/sec
      bornAt: now,
    });
  };

  document.addEventListener('mousemove', updateMouse, { passive: true });
  document.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    shoot();
  }, { passive: true });

  const gameIsActive = () => {
    const top = window.scrollY;
    const bottom = top + window.innerHeight;
    // overlap simple entre zone de jeu (startY..endY) et viewport
    return gameEndY > top && gameStartY < bottom;
  };

  const updateActive = () => {
    const now = performance.now();
    if (now - lastBoundsUpdate > 250) {
      recalcBounds();
      lastBoundsUpdate = now;
    }
    scrollActive = gameIsActive();
  };

  // Controls
  let inputDir = { x: 1, y: 0 };
  let lastManualInputAt = 0;
  const MANUAL_GRACE_MS = 450; // après un appui flèche, on laisse le manuel prendre 0.45s
  const setDirFromKey = (key) => {
    const s = 1;
    if (key === 'ArrowLeft') return { x: -s, y: 0 };
    if (key === 'ArrowRight') return { x: s, y: 0 };
    if (key === 'ArrowUp') return { x: 0, y: -s };
    if (key === 'ArrowDown') return { x: 0, y: s };
    return null;
  };

  document.addEventListener('keydown', (e) => {
    // Pause des contrôles pendant le gate terminal
    if (window.__terminalGateActive) return;
    if (!scrollActive) return;
    if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault();
      const d = setDirFromKey(e.key);
      if (d) inputDir = d;
      lastManualInputAt = performance.now();
    }
  }, { passive: false });

  // Main loop
  let raf = null;
  let lastTs = 0;

  const drawPac = (x, y, t) => {
    // Bouche plus ouverte (ça contrôle l'angle "mangé")
    const mouth = 0.42 + 0.18 * Math.sin(t * 0.012);
    const r = PAC_RADIUS;
    const ang = Math.atan2(pac.dirY, pac.dirX);
    ctx.save();
    ctx.globalAlpha = 0.95;

    // Pac-Man jaune/ambre (corps plein)
    ctx.fillStyle = 'rgba(251,191,36,0.95)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Bouche "inversée" : on découpe un secteur en transparent
    // (destination-out = gomme visuelle du secteur)
    const start = ang - mouth;
    const end = start + mouth * 2;
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, r, start, end, false);
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // Contour (avec la bouche évidée)
    ctx.strokeStyle = 'rgba(251,191,36,0.75)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // petite "gomme" (oeil)
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.beginPath();
    ctx.arc(x + pac.dirX * r * 0.22, y + pac.dirY * r * 0.22, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawGhost = (x, y, ghost, t) => {
    const r = GHOST_RADIUS;
    const eaten = ghost.respawnAt > 0 && performance.now() < ghost.respawnAt;
    const pulse = eaten ? 0.35 : (0.65 + 0.2 * Math.sin(t * 0.01 + ghost.hue));
    ctx.save();
    ctx.globalAlpha = 0.85 * pulse;
    ctx.fillStyle = `hsla(${ghost.hue}, 100%, 55%, 0.9)`;

    // forme simple type fantome
    ctx.beginPath();
    ctx.arc(x, y - 2, r, Math.PI, 0, false);
    ctx.lineTo(x + r, y + r - 2);
    ctx.quadraticCurveTo(x + r * 0.75, y + r + 6, x, y + r - 2);
    ctx.quadraticCurveTo(x - r * 0.75, y + r + 6, x - r, y + r - 2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // yeux
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(x - 5, y - 3, 3.2, 0, Math.PI * 2);
    ctx.arc(x + 5, y - 3, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawPellets = (t) => {
    const gameW = w;
    const y0 = gameStartY;
    const scrollY = window.scrollY;
    const r = 3.2;

    for (let i = 0; i < pellets.length; i += 1) {
      const p = pellets[i];
      const x = p.xN * gameW;
      const yDoc = y0 + p.yN * gameHeight;
      const y = yDoc - scrollY;
      if (y < -20 || y > h + 20) continue;

      const flick = 0.65 + 0.35 * Math.sin(t * 0.01 + i);
      ctx.save();
      ctx.globalAlpha = 0.55 * flick;
      ctx.fillStyle = 'rgba(251,191,36,1)';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const loop = (ts) => {
    if (!ts) ts = 0;
    updateActive();

    const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
    lastTs = ts;

    // clear always (canvas fully overlay)
    ctx.clearRect(0, 0, w, h);

    if (!scrollActive) {
      raf = requestAnimationFrame(loop);
      return;
    }

    if (dt > 0) {
      const now = performance.now();

      // Autopilot : diriger Pac-Man vers le fantôme le plus proche (si pas de manuel récent)
      if (!lastManualInputAt || now - lastManualInputAt > MANUAL_GRACE_MS) {
        const gameW = w;
        const pacX = pac.xN * gameW;
        const pacYDoc = gameStartY + pac.yN * gameHeight;
        const pacY = pacYDoc - window.scrollY;

        let nearest = null;
        let bestD2 = Infinity;
        for (let i = 0; i < ghosts.length; i += 1) {
          const g = ghosts[i];
          if (g.respawnAt && ts < g.respawnAt) continue; // fantôme "mangé" : on ignore

          const gx = g.xN * gameW;
          const gy = (gameStartY + g.yN * gameHeight) - window.scrollY;
          const d2 = dist2(pacX, pacY, gx, gy);
          if (d2 < bestD2) {
            bestD2 = d2;
            nearest = { gx, gy };
          }
        }

        if (nearest) {
          const dx = nearest.gx - pacX;
          const dy = nearest.gy - pacY;
          const len = Math.hypot(dx, dy) || 1;
          inputDir = { x: dx / len, y: dy / len };
        }
      }

      // update pac
      pac.dirX = inputDir.x;
      pac.dirY = inputDir.y;

      const gameW = w;
      const dX = (pac.dirX * pac.speed * dt) / gameW;
      const dY = (pac.dirY * pac.speed * dt) / gameHeight;

      pac.xN = (pac.xN + dX + 1) % 1;
      pac.yN = (pac.yN + dY + 1) % 1;

      // eat pellets
      const pacX = pac.xN * gameW;
      const pacYDoc = gameStartY + pac.yN * gameHeight;
      const pacY = pacYDoc - window.scrollY;
      for (let i = 0; i < pellets.length; i += 1) {
        const p = pellets[i];
        const px = p.xN * gameW;
        const py = (gameStartY + p.yN * gameHeight) - window.scrollY;
        if (py < -20 || py > h + 20) continue;

        if (dist2(pacX, pacY, px, py) < (PAC_RADIUS + 4) * (PAC_RADIUS + 4)) {
          score += 10;
          pellets[i] = spawnPellet();
        }
      }

      // update bullets (tir souris)
      if (bullets.length) {
        const bulletMaxAgeMs = 1200;
        const bulletHitR2 = (BULLET_RADIUS + GHOST_RADIUS) * (BULLET_RADIUS + GHOST_RADIUS);
        const alive = [];

        for (let b = 0; b < bullets.length; b += 1) {
          const blt = bullets[b];
          const age = ts - blt.bornAt;
          if (age > bulletMaxAgeMs) continue;

          blt.x += blt.vx * blt.speed * dt;
          blt.y += blt.vy * blt.speed * dt;

          // hors écran -> drop
          if (blt.x < -30 || blt.x > w + 30 || blt.y < -30 || blt.y > h + 30) continue;

          // collision fantômes
          let hit = false;
          for (let i = 0; i < ghosts.length; i += 1) {
            const g = ghosts[i];
            if (g.respawnAt && ts < g.respawnAt) continue;
            const gx = g.xN * w;
            const gy = (gameStartY + g.yN * gameHeight) - window.scrollY;
            if (dist2(blt.x, blt.y, gx, gy) < bulletHitR2) {
              score += 120;
              g.respawnAt = ts + 900;
              g.eatenAt = ts;
              g.xN = Math.random();
              g.yN = Math.random();
              hit = true;
              break;
            }
          }
          if (hit) continue;

          alive.push(blt);
        }

        bullets = alive;
      }

      // update ghosts
      const chaseRange = 240;
      for (let i = 0; i < ghosts.length; i += 1) {
        const g = ghosts[i];
        if (g.respawnAt && ts < g.respawnAt) {
          // eaten: keep it still
          continue;
        }

        const gx = g.xN * gameW;
        const gy = (gameStartY + g.yN * gameHeight) - window.scrollY;

        // petit steering vers pac (comme un fantome paresseux)
        const d2 = dist2(gx, gy, pacX, pacY);
        if (d2 < chaseRange * chaseRange) {
          const d = Math.sqrt(Math.max(1, d2));
          const steer = 0.55 * dt;
          g.vx = (g.vx + (pacX - gx) / d * steer);
          g.vy = (g.vy + (pacY - gy) / d * steer);
          const len = Math.hypot(g.vx, g.vy) || 1;
          g.vx /= len;
          g.vy /= len;
        } else {
          // wander occasionnel
          if (Math.random() < 0.015) {
            const ang = rand(0, Math.PI * 2);
            g.vx = Math.cos(ang);
            g.vy = Math.sin(ang);
          }
        }

        // move dans le monde (coords normalisées)
        const moveX = (g.vx * g.speed * dt) / gameW;
        const moveY = (g.vy * g.speed * dt) / gameHeight;
        g.xN = (g.xN + moveX + 1) % 1;
        g.yN = (g.yN + moveY + 1) % 1;

        // eat ghost
        const nx = g.xN * gameW;
        const ny = (gameStartY + g.yN * gameHeight) - window.scrollY;
        if (dist2(pacX, pacY, nx, ny) < (PAC_RADIUS + GHOST_RADIUS - 2) * (PAC_RADIUS + GHOST_RADIUS - 2)) {
          score += 200;
          g.respawnAt = ts + 1200;
          g.eatenAt = ts;
          g.xN = Math.random();
          g.yN = Math.random();
        }
      }
    }

    // draw
    const t = ts;
    drawPellets(t);

    // bullets
    if (bullets.length) {
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = 'rgba(57,255,20,0.95)';
      for (let b = 0; b < bullets.length; b += 1) {
        const blt = bullets[b];
        ctx.beginPath();
        ctx.arc(blt.x, blt.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // ghosts in front
    for (let i = 0; i < ghosts.length; i += 1) {
      const g = ghosts[i];
      const gx = g.xN * w;
      const gy = (gameStartY + g.yN * gameHeight) - window.scrollY;
      if (gy < -50 || gy > h + 50) continue;
      drawGhost(gx, gy, g, t);
    }
    drawPac(pac.xN * w, (gameStartY + pac.yN * gameHeight) - window.scrollY, t);

    // HUD
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(14, 12, 190, 46);
    ctx.fillStyle = 'rgba(251,191,36,1)';
    ctx.font = '700 14px monospace';
    ctx.fillText('PACMAN', 26, 30);
    ctx.fillStyle = 'rgba(57,255,20,1)';
    ctx.font = '600 13px monospace';
    ctx.fillText('Score: ' + score, 26, 47);
    ctx.restore();

    raf = requestAnimationFrame(loop);
  };

  window.addEventListener('resize', resize);
  resize();
  raf = requestAnimationFrame(loop);
})();

