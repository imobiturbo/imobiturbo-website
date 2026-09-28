/**
 * UNSCOUTED IMMO — Interactive Audio/Video & Dialog Controller
 * Arquitetura de reprodução resiliente e controle de modais
 */

document.addEventListener('DOMContentLoaded', () => {
  initVideoControls();
  initDialogModal();
  initIntersectionAutoPlay();
});

/**
 * SVGs de ícones de controle
 */
const ICONS = {
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 10 7-10 7Z" fill="currentColor"></path></svg>`,
  pause: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor"></rect><rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor"></rect></svg>`,
  muted: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5 5 9H2v6h3l5 4Z"></path><path d="m16 9 6 6m0-6-6 6"></path></svg>`,
  unmuted: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path><path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path></svg>`
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
          // Pausa outros vídeos para evitar sobreposição de áudio
          pauseOtherVideos(video);
          video.play().then(() => {
            updatePlayButton(playBtn, true);
          }).catch(() => {
            // Em caso de restrição do navegador
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
          // Desmuta este e silencia outros
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

    // Atualiza botão se vídeo pausar/iniciar por eventos nativos
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
        // Tenta dar play muted
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
 * Controle do Dialog / Modal de Qualificação
 */
function initDialogModal() {
  const dialog = document.getElementById('creation-dialog');
  const openButtons = document.querySelectorAll('[data-action="open-dialog"]');
  const closeButton = dialog?.querySelector('.u-creation-dialog-close');

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

  // Fecha clicando no backdrop
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
