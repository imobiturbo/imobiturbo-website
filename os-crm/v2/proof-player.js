(() => {
  'use strict';
  const formatTime = value => {
    const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  window.OSProofPlayer = {
    mount(video, stage) {
      const binding = new AbortController();
      const options = { signal: binding.signal };
      const controls = stage.querySelector('.proof-controls');
      const toggle = stage.querySelector('[data-proof-toggle]');
      const mute = stage.querySelector('[data-proof-mute]');
      const fullscreen = stage.querySelector('[data-proof-fullscreen]');
      const seek = stage.querySelector('[data-proof-seek]');
      const time = stage.querySelector('[data-proof-time]');
      const status = stage.querySelector('[data-proof-status]');
      controls.hidden = false;
      video.controls = false;
      video.tabIndex = 0;
      status.textContent = 'Carregando vídeo…';
      status.hidden = false;

      function update() {
        if (binding.signal.aborted) return;
        const duration = Number.isFinite(video.duration) ? video.duration : 0;
        seek.disabled = !duration;
        seek.max = duration || 100;
        seek.value = video.currentTime;
        seek.style.setProperty('--proof-progress', `${duration ? video.currentTime / duration * 100 : 0}%`);
        seek.setAttribute('aria-valuetext', `${formatTime(video.currentTime)} de ${formatTime(duration)}`);
        time.replaceChildren(document.createTextNode(formatTime(video.currentTime) + ' '));
        const total = document.createElement('span');
        total.textContent = `/ ${formatTime(duration)}`;
        time.append(total);
        const playing = !video.paused && !video.ended;
        toggle.setAttribute('aria-label', playing ? 'Pausar vídeo' : 'Reproduzir vídeo');
        toggle.title = toggle.getAttribute('aria-label');
        toggle.querySelector('[data-icon-play]').hidden = playing;
        toggle.querySelector('[data-icon-pause]').hidden = !playing;
        mute.setAttribute('aria-label', video.muted ? 'Ativar som' : 'Silenciar vídeo');
        mute.title = mute.getAttribute('aria-label');
        mute.querySelector('[data-icon-sound]').hidden = video.muted;
        mute.querySelector('[data-icon-muted]').hidden = !video.muted;
        fullscreen.setAttribute('aria-label', document.fullscreenElement === stage ? 'Sair da tela cheia' : 'Tela cheia');
        fullscreen.title = fullscreen.getAttribute('aria-label');
      }
      async function play() {
        try { await video.play(); }
        catch {
          if (binding.signal.aborted) return;
          status.textContent = 'Toque em reproduzir para assistir.';
          status.hidden = false;
        }
        update();
      }
      function togglePlayback() {
        if (video.paused || video.ended) play();
        else video.pause();
      }
      async function toggleFullscreen() {
        try {
          if (document.fullscreenElement === stage) await document.exitFullscreen();
          else if (stage.requestFullscreen) await stage.requestFullscreen();
          else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
        } catch { /* The inline player remains available if fullscreen is refused. */ }
        update();
      }
      function seekTo(value) {
        if (Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, value));
        update();
      }
      toggle.addEventListener('click', togglePlayback, options);
      video.addEventListener('click', togglePlayback, options);
      mute.addEventListener('click', () => { video.muted = !video.muted; }, options);
      fullscreen.addEventListener('click', toggleFullscreen, options);
      seek.addEventListener('input', () => seekTo(Number(seek.value)), options);
      stage.addEventListener('keydown', event => {
        if (event.target instanceof HTMLInputElement) return;
        if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          seekTo(video.currentTime + (event.key === 'ArrowRight' ? 5 : -5));
        } else if (event.target === video && [' ', 'Enter'].includes(event.key)) {
          event.preventDefault(); togglePlayback();
        } else if (event.key.toLowerCase() === 'm') {
          event.preventDefault(); video.muted = !video.muted;
        }
      }, options);
      video.addEventListener('loadedmetadata', () => {
        stage.closest('dialog').classList.toggle('portrait-proof', video.videoHeight > video.videoWidth);
      }, options);
      for (const name of ['loadedmetadata', 'durationchange', 'timeupdate', 'play', 'pause', 'ended', 'volumechange']) {
        video.addEventListener(name, update, options);
      }
      video.addEventListener('playing', () => { status.hidden = true; }, options);
      video.addEventListener('canplay', () => { status.hidden = true; }, options);
      video.addEventListener('waiting', () => { status.textContent = 'Carregando vídeo…'; status.hidden = false; }, options);
      video.addEventListener('error', () => {
        status.textContent = 'Não foi possível carregar este relato. Feche e tente novamente.';
        status.hidden = false;
      }, options);
      document.addEventListener('fullscreenchange', update, options);
      update();
      return {
        play,
        dispose() {
          binding.abort();
          video.pause();
          video.removeAttribute('src');
          video.load();
          controls.hidden = true;
          status.hidden = true;
          stage.closest('dialog').classList.remove('portrait-proof');
        },
      };
    },
  };
})();
