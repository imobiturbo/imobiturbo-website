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
    const mask = container.querySelector('.vsl-smart-autoplay, .video-play-badge');
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
      const mask = container.querySelector('.vsl-smart-autoplay, .video-play-badge');
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
 * Controle do Mini Formulário por Etapas e Modal de Qualificação
 */
function initDialogModal() {
  const dialog = document.getElementById('qualification-dialog');
  const openButtons = document.querySelectorAll('[data-action="open-dialog"]');
  const closeButton = dialog?.querySelector('#dialogCloseBtn, .dialog-close-btn');

  if (!dialog) return;

  // Estado do formulário
  let currentStep = 1;
  const totalSteps = 5;
  const leadData = {
    name: '',
    phone: '',
    email: '',
    role: '',
    revenue: ''
  };

  // Elementos do DOM
  const progressBar = document.getElementById('dialogProgressBar');
  const progressPct = document.getElementById('dialogProgressPct');
  const stepPanes = dialog.querySelectorAll('.form-step-pane');
  const firstNameSpans = dialog.querySelectorAll('.user-first-name');

  // Inputs
  const inputName = document.getElementById('leadName');
  const inputPhone = document.getElementById('leadPhone');
  const inputEmail = document.getElementById('leadEmail');
  const inputRoleCustom = document.getElementById('leadRoleCustom');
  const customRoleWrap = document.getElementById('customRoleWrap');
  const btnStep4 = document.getElementById('btnStep4');

  // Error messages
  const nameError = document.getElementById('nameError');
  const phoneError = document.getElementById('phoneError');
  const emailError = document.getElementById('emailError');
  const roleError = document.getElementById('roleError');
  const revenueError = document.getElementById('revenueError');

  // Buttons next / back
  const btnStep1 = document.getElementById('btnStep1');
  const btnStep2 = document.getElementById('btnStep2');
  const btnStep3 = document.getElementById('btnStep3');
  const backButtons = dialog.querySelectorAll('.step-btn-back');
  const roleCards = dialog.querySelectorAll('#roleOptionsGrid .option-card');
  const revenueCards = dialog.querySelectorAll('#revenueOptionsGrid .option-card');

  // Máscara e validação de telefone brasileiro
  function formatBrazilianPhone(val) {
    const digits = val.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  function isValidBrazilianPhone(phone) {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || digits.length > 11) return false;
    const ddd = parseInt(digits.slice(0, 2), 10);
    // DDDs válidos no Brasil (11 a 99)
    if (ddd < 11 || ddd > 99) return false;
    // Bloqueia dígitos repetidos óbvios
    if (/^(\d)\1+$/.test(digits)) return false;
    return true;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim());
  }

  // Atualização visual do passo
  function goToStep(step) {
    currentStep = step;

    // Atualiza barra de progresso
    if (progressBar && progressPct) {
      if (step <= totalSteps) {
        const pct = Math.round((step / totalSteps) * 100);
        progressBar.style.width = `${pct}%`;
        progressPct.textContent = step === totalSteps ? 'Pergunta Final' : `Etapa ${step}/${totalSteps}`;
      } else {
        progressBar.style.width = '100%';
        progressPct.textContent = 'Quase lá...';
      }
    }

    // Esconde todos os panes e exibe o ativo
    stepPanes.forEach((pane) => {
      pane.classList.remove('active');
      pane.style.display = 'none';
    });

    const targetPane = dialog.querySelector(`[data-step="${step}"]`) || document.getElementById('formStepLoading');
    if (targetPane) {
      targetPane.style.display = 'block';
      setTimeout(() => targetPane.classList.add('active'), 10);

      // Auto-foco no input
      const input = targetPane.querySelector('input');
      if (input) {
        setTimeout(() => input.focus(), 80);
      }
    }
  }

  // Step 1: Validação do Nome
  function handleStep1() {
    const val = inputName.value.trim();
    if (val.length < 2) {
      inputName.classList.add('input-error');
      nameError?.classList.add('visible');
      inputName.focus();
      return false;
    }
    inputName.classList.remove('input-error');
    nameError?.classList.remove('visible');
    leadData.name = val;

    // Atualiza primeiro nome
    const firstName = val.split(' ')[0] || 'Você';
    firstNameSpans.forEach((span) => {
      span.textContent = firstName;
    });

    goToStep(2);
    return true;
  }

  // Step 2: Validação do Telefone
  function handleStep2() {
    const val = inputPhone.value.trim();
    if (!isValidBrazilianPhone(val)) {
      inputPhone.classList.add('input-error');
      phoneError?.classList.add('visible');
      inputPhone.focus();
      return false;
    }
    inputPhone.classList.remove('input-error');
    phoneError?.classList.remove('visible');
    leadData.phone = val;

    goToStep(3);
    return true;
  }

  // Step 3: Validação do E-mail
  function handleStep3() {
    const val = inputEmail.value.trim();
    if (!isValidEmail(val)) {
      inputEmail.classList.add('input-error');
      emailError?.classList.add('visible');
      inputEmail.focus();
      return false;
    }
    inputEmail.classList.remove('input-error');
    emailError?.classList.remove('visible');
    leadData.email = val;

    goToStep(4);
    return true;
  }

  // Step 4: Cargo
  function selectRole(roleName, cardElement) {
    roleCards.forEach((c) => c.classList.remove('selected'));
    cardElement?.classList.add('selected');
    roleError?.classList.remove('visible');

    if (roleName === 'custom') {
      if (customRoleWrap) customRoleWrap.style.display = 'block';
      if (btnStep4) btnStep4.style.display = 'inline-flex';
      inputRoleCustom?.focus();
    } else {
      if (customRoleWrap) customRoleWrap.style.display = 'none';
      if (btnStep4) btnStep4.style.display = 'none';
      leadData.role = roleName;
      // Avança direto em 1 clique
      setTimeout(() => goToStep(5), 180);
    }
  }

  function handleStep4Custom() {
    const val = inputRoleCustom.value.trim();
    if (!val) {
      inputRoleCustom.classList.add('input-error');
      roleError?.classList.add('visible');
      inputRoleCustom.focus();
      return false;
    }
    inputRoleCustom.classList.remove('input-error');
    roleError?.classList.remove('visible');
    leadData.role = val;
    goToStep(5);
    return true;
  }

  // Step 5: Faturamento & Submissão
  function selectRevenueAndSubmit(revName, cardElement) {
    revenueCards.forEach((c) => c.classList.remove('selected'));
    cardElement?.classList.add('selected');
    revenueError?.classList.remove('visible');
    leadData.revenue = revName;

    // Inicia submissão
    setTimeout(() => submitLeadAndRedirect(), 180);
  }

  // Envio para o Imobiturbo OS e WAHA
  async function submitLeadAndRedirect() {
    goToStep(6); // Loading

    // Captura parâmetros de UTM da URL
    const urlParams = new URLSearchParams(window.location.search);
    const payload = {
      project: 'imobicreator',
      nome: leadData.name,
      telefone: leadData.phone,
      email: leadData.email,
      cargo: leadData.role,
      faturamento: leadData.revenue,
      utm_source: urlParams.get('utm_source') || '',
      utm_medium: urlParams.get('utm_medium') || '',
      utm_campaign: urlParams.get('utm_campaign') || '',
      utm_content: urlParams.get('utm_content') || '',
      utm_term: urlParams.get('utm_term') || '',
    };

    // Monta fallback de URL direta caso ocorra timeout
    const msgRedirect = encodeURIComponent(
      `Olá Natan! Sou ${leadData.name}${leadData.role ? ` (${leadData.role})` : ''}, com faturamento anual ${leadData.revenue}. Acabei de preencher o formulário no Imobicreator e quero desenhar o influenciador de IA da nossa empresa.`
    );
    const fallbackWhatsappUrl = `https://wa.me/5521983747796?text=${msgRedirect}`;

    let redirected = false;
    const executeRedirect = (targetUrl) => {
      if (!redirected) {
        redirected = true;
        window.location.href = targetUrl || fallbackWhatsappUrl;
      }
    };

    // Timeout de segurança: no máximo 2.2 segundos para garantir que o usuário não fique esperando
    const safetyTimeout = setTimeout(() => {
      executeRedirect(fallbackWhatsappUrl);
    }, 2200);

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      clearTimeout(safetyTimeout);

      if (res.ok) {
        const data = await res.json().catch(() => null);
        const finalUrl = data?.redirect_url || fallbackWhatsappUrl;
        setTimeout(() => executeRedirect(finalUrl), 400);
      } else {
        executeRedirect(fallbackWhatsappUrl);
      }
    } catch (err) {
      clearTimeout(safetyTimeout);
      console.warn('[Lead Submit Warning]:', err);
      executeRedirect(fallbackWhatsappUrl);
    }
  }

  // Event Listeners dos Steps
  btnStep1?.addEventListener('click', handleStep1);
  btnStep2?.addEventListener('click', handleStep2);
  btnStep3?.addEventListener('click', handleStep3);
  btnStep4?.addEventListener('click', handleStep4Custom);

  // Máscara dinâmica no input de telefone
  inputPhone?.addEventListener('input', (e) => {
    e.target.value = formatBrazilianPhone(e.target.value);
    inputPhone.classList.remove('input-error');
    phoneError?.classList.remove('visible');
  });

  inputName?.addEventListener('input', () => {
    inputName.classList.remove('input-error');
    nameError?.classList.remove('visible');
  });

  inputEmail?.addEventListener('input', () => {
    inputEmail.classList.remove('input-error');
    emailError?.classList.remove('visible');
  });

  inputRoleCustom?.addEventListener('input', () => {
    inputRoleCustom.classList.remove('input-error');
    roleError?.classList.remove('visible');
  });

  // Enter avança automaticamente
  inputName?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStep1();
    }
  });

  inputPhone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStep2();
    }
  });

  inputEmail?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStep3();
    }
  });

  inputRoleCustom?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleStep4Custom();
    }
  });

  // Role card selection
  roleCards.forEach((card) => {
    card.addEventListener('click', () => {
      const role = card.getAttribute('data-role');
      selectRole(role, card);
    });
  });

  // Revenue card selection
  revenueCards.forEach((card) => {
    card.addEventListener('click', () => {
      const revenue = card.getAttribute('data-revenue');
      selectRevenueAndSubmit(revenue, card);
    });
  });

  // Back buttons
  backButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const backStep = parseInt(btn.getAttribute('data-back') || '1', 10);
      goToStep(backStep);
    });
  });

  // Abrir e fechar o modal
  const openDialog = () => {
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    // Se for abertura limpa, reinicia no step 1
    if (currentStep > 5) {
      goToStep(1);
    } else {
      goToStep(currentStep);
    }
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

