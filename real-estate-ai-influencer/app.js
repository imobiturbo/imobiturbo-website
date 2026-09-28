/**
 * IMOBICREATOR — Interactive Audio/Video, FAQ & Dialog Controller
 * Imobiturbo Design System v4.0
 */

document.addEventListener('DOMContentLoaded', () => {
  initVideoControls();
  initInfinitePreviewMotion();
  initDialogModal();
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
 * Controlador dos vídeos com Smart Autoplay (Estilo /vagas/ no rodapé esquerdo)
 * - Motion infinito de prévia muted em todos os vídeos
 * - Toque/clique em qualquer ponto do card inicia reprodução com som do início (00:00)
 * - Máscara VTurb com botão pulsante no rodapé esquerdo é ocultada ao dar play
 * - Novo toque alterna play/pause
 * - Ao término do vídeo, retorna para prévia muted em loop e reexibe a máscara
 */
function initVideoControls() {
  const containers = document.querySelectorAll('[data-video-container]');

  containers.forEach((container) => {
    const video = container.querySelector('video');
    const mask = container.querySelector('.vsl-smart-autoplay');
    const soundBtn = container.querySelector('[data-action="toggle-sound"]');

    if (!video) return;

    // Helper para ativar som e tocar do início
    function activateVideoWithAudio() {
      // Pausa e reseta outros vídeos que estejam com som
      resetOtherActiveVideos(container);

      container.classList.add('video-active');
      if (mask) mask.classList.add('vsl-hidden');

      video.pause();
      video.currentTime = 0;
      video.loop = false;
      video.muted = false;
      video.volume = 1.0;

      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          console.warn('Playback audio retry:', err);
          video.muted = false;
          video.play();
        });
      }
      updateSoundButton(soundBtn, true);
    }

    // Helper para retornar à prévia em loop mudo
    function resetToPreviewMode() {
      container.classList.remove('video-active');
      if (mask) mask.classList.remove('vsl-hidden');

      video.currentTime = 0;
      video.loop = true;
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
      updateSoundButton(soundBtn, false);
    }

    // Clique/toque em qualquer lugar do container do vídeo
    container.addEventListener('click', (e) => {
      // Não intercepta se o clique foi em links como o badge do Instagram ou botões de diálogo
      if (e.target.closest('a') || e.target.closest('[data-action="open-dialog"]')) {
        return;
      }

      // Se clicou no botão de som especificamente
      if (e.target.closest('[data-action="toggle-sound"]')) {
        e.stopPropagation();
        if (video.muted) {
          activateVideoWithAudio();
        } else {
          resetToPreviewMode();
        }
        return;
      }

      // Se ainda não estava ativo com som, inicia com som do início
      if (!container.classList.contains('video-active') || video.muted) {
        activateVideoWithAudio();
      } else {
        // Já estava ativo com som: alterna play / pause
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      }
    });

    // Quando o vídeo termina
    video.addEventListener('ended', () => {
      resetToPreviewMode();
    });

    // Sincroniza estado do botão de som
    video.addEventListener('volumechange', () => {
      updateSoundButton(soundBtn, !video.muted);
    });
  });
}

function updateSoundButton(btn, isUnmuted) {
  if (!btn) return;
  btn.innerHTML = isUnmuted ? ICONS.unmuted : ICONS.muted;
  btn.setAttribute('aria-label', isUnmuted ? 'Desativar som' : 'Ativar som');
  btn.setAttribute('aria-pressed', isUnmuted ? 'true' : 'false');
}

/**
 * Reseta qualquer outro vídeo que esteja ativo com som de volta para prévia muted
 */
function resetOtherActiveVideos(currentContainer) {
  const containers = document.querySelectorAll('[data-video-container]');
  containers.forEach((container) => {
    if (container !== currentContainer && container.classList.contains('video-active')) {
      const video = container.querySelector('video');
      const mask = container.querySelector('.vsl-smart-autoplay');
      const soundBtn = container.querySelector('[data-action="toggle-sound"]');

      container.classList.remove('video-active');
      if (mask) mask.classList.remove('vsl-hidden');

      if (video) {
        video.currentTime = 0;
        video.loop = true;
        video.muted = true;
        video.play().catch(() => {});
      }
      updateSoundButton(soundBtn, false);
    }
  });
}

/**
 * Garante que todos os vídeos rodem com motion infinito na prévia sem travar
 */
function initInfinitePreviewMotion() {
  const videos = document.querySelectorAll('[data-video-container] video');

  function startPreviews() {
    videos.forEach((video) => {
      const container = video.closest('[data-video-container]');
      if (!container || !container.classList.contains('video-active')) {
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        if (video.paused) {
          video.play().catch(() => {});
        }
      }
    });
  }

  // Inicia imediatamente
  startPreviews();

  // Aciona ao primeiro toque na tela para contornar restrições severas de autoplay em mobile
  const unlockEvents = ['touchstart', 'pointerdown', 'scroll'];
  const unlockAutoplay = () => {
    startPreviews();
    unlockEvents.forEach((ev) => window.removeEventListener(ev, unlockAutoplay));
  };
  unlockEvents.forEach((ev) => window.addEventListener(ev, unlockAutoplay, { passive: true, once: true }));

  // Se o usuário alternar de aba e voltar, retoma as prévias
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      startPreviews();
    }
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
