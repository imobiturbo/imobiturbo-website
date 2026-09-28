/**
 * IMOBICREATOR — Interactive Audio/Video, FAQ & Dialog Controller
 * Imobiturbo Design System v4.0
 */

document.addEventListener('DOMContentLoaded', () => {
  initVideoControls();
  initDialogModal();
  initIntersectionAutoPlay();
  initFaqAccordion();
});

/**
 * SVGs de ícones de controle
 */
const ICONS = {
  play: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="6 3 20 12 6 21 6 3" fill="currentColor"></polygon></svg>`,
  pause: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="6" y="4" width="4" height="16" fill="currentColor"></rect><rect x="14" y="4" width="4" height="16" fill="currentColor"></rect></svg>`,
  muted: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`,
  unmuted: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`
};

/**
 * Inicializa os botões de Play/Pause e Mute/Unmute em todos os containers de vídeo
 */
function initVideoControls() {
  const sections = document.querySelectorAll('[data-video-container]');

  sections.forEach((container) => {
    const video = container.querySelector('video');
    const playBtn = container.querySelector('[data-action="toggle-play"]');
    const soundBtn = container.querySelector('[data-action="toggle-sound"]');

    if (!video) return;

    // Sincroniza estado inicial
    updatePlayButton(playBtn, !video.paused);
    updateSoundButton(soundBtn, !video.muted);

    // Play / Pause Toggle
    if (playBtn) {
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.paused) {
          pauseOtherVideos(video);
          video.play().then(() => {
            updatePlayButton(playBtn, true);
          }).catch(() => {
            video.muted = true;
            video.play();
            updatePlayButton(playBtn, true);
            updateSoundButton(soundBtn, false);
          });
        } else {
          video.pause();
          updatePlayButton(playBtn, false);
        }
      });
    }

    // Mute / Unmute Toggle
    if (soundBtn) {
      soundBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (video.muted) {
          silenceOtherVideos(video);
          video.muted = false;
          updateSoundButton(soundBtn, true);
          if (video.paused) {
            video.play();
            updatePlayButton(playBtn, true);
          }
        } else {
          video.muted = true;
          updateSoundButton(soundBtn, false);
        }
      });
    }

    video.addEventListener('play', () => updatePlayButton(playBtn, true));
    video.addEventListener('pause', () => updatePlayButton(playBtn, false));
    video.addEventListener('volumechange', () => updateSoundButton(soundBtn, !video.muted));
  });
}

function updatePlayButton(btn, isPlaying) {
  if (!btn) return;
  btn.innerHTML = isPlaying ? ICONS.pause : ICONS.play;
  btn.setAttribute('aria-label', isPlaying ? 'Pausar vídeo' : 'Reproduzir vídeo');
}

function updateSoundButton(btn, isUnmuted) {
  if (!btn) return;
  btn.innerHTML = isUnmuted ? ICONS.unmuted : ICONS.muted;
  btn.setAttribute('aria-label', isUnmuted ? 'Desativar som' : 'Ativar som');
  btn.setAttribute('aria-pressed', isUnmuted ? 'true' : 'false');
}

function pauseOtherVideos(currentVideo) {
  document.querySelectorAll('video').forEach((v) => {
    if (v !== currentVideo && !v.paused) {
      v.pause();
    }
  });
}

function silenceOtherVideos(currentVideo) {
  document.querySelectorAll('video').forEach((v) => {
    if (v !== currentVideo) {
      v.muted = true;
    }
  });
}

/**
 * Autoplay inteligente com IntersectionObserver
 */
function initIntersectionAutoPlay() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target.querySelector('video');
      if (!video) return;

      if (entry.isIntersecting) {
        if (video.paused) {
          video.muted = true;
          video.play().catch(() => {});
        }
      } else {
        if (!video.paused) {
          video.pause();
        }
      }
    });
  }, { threshold: 0.35 });

  document.querySelectorAll('[data-video-container]').forEach((el) => {
    observer.observe(el);
  });
}

/**
 * FAQ Accordion Controller
 */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach((item) => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      // Fecha os outros
      faqItems.forEach((other) => {
        if (other !== item) other.classList.remove('active');
      });

      // Alterna o clicado
      item.classList.toggle('active', !isActive);
    });
  });
}

/**
 * Controle do Dialog / Modal de Qualificação
 */
function initDialogModal() {
  const dialog = document.getElementById('qualification-dialog');
  const openButtons = document.querySelectorAll('[data-action="open-dialog"]');
  const closeButton = dialog?.querySelector('.dialog-close-btn');

  if (!dialog) return;

  const openDialog = () => {
    dialog.showModal();
    document.body.style.overflow = 'hidden';
  };

  const closeDialog = () => {
    dialog.close();
    document.body.style.overflow = '';
  };

  openButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openDialog();
    });
  });

  if (closeButton) {
    closeButton.addEventListener('click', closeDialog);
  }

  dialog.addEventListener('click', (e) => {
    const rect = dialog.getBoundingClientRect();
    const isInDialog = (
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width
    );
    if (!isInDialog) {
      closeDialog();
    }
  });

  dialog.addEventListener('close', () => {
    document.body.style.overflow = '';
  });
}
