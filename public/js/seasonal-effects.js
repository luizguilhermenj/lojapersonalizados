// Uma única implementação: CSS anima transform/opacity, sem loops JS por frame.
export function createSeasonalEffects() {
  let cleanup = () => {};
  return {
    stop() { cleanup(); cleanup = () => {}; },
    set(config) {
      this.stop();
      if (!config || !['snow', 'petals'].includes(config.type)) return;
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      const mobile = matchMedia('(max-width: 600px)');
      let layer;
      let toggle;
      let paused = false;
      try { paused = sessionStorage.getItem('artize_seasonal_motion') === 'paused'; } catch { /* Armazenamento opcional. */ }
      const removeLayer = () => { layer?.remove(); layer = undefined; };
      function render() {
        removeLayer();
        toggle?.remove(); toggle = undefined;
        if (reduced.matches || document.hidden) return;
        toggle = document.createElement('button');
        toggle.type = 'button'; toggle.className = 'seasonal-effects-toggle';
        toggle.textContent = `${paused ? 'Ativar' : 'Pausar'} ${config.type === 'snow' ? 'neve' : 'pétalas'}`;
        toggle.setAttribute('aria-label', 'Animação sazonal');
        toggle.setAttribute('aria-pressed', String(!paused));
        toggle.addEventListener('click', () => {
          paused = !paused;
          try { sessionStorage.setItem('artize_seasonal_motion', paused ? 'paused' : 'enabled'); } catch { /* Preferência somente em memória. */ }
          render();
          toggle?.focus();
        });
        document.body.append(toggle);
        if (paused) return;
        layer = document.createElement('div');
        layer.className = `seasonal-effects seasonal-effects--${config.type}`;
        layer.setAttribute('aria-hidden', 'true');
        layer.inert = true;
        const count = Math.max(0, Math.min(40, Math.floor(mobile.matches ? config.mobileCount : config.count) || 0));
        const min = Math.max(12, Number(config.minDuration) || 16);
        const max = Math.max(min, Number(config.maxDuration) || 30);
        const fragment = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
          const particle = document.createElement('span');
          const core = document.createElement('i');
          particle.className = 'seasonal-particle'; core.className = 'seasonal-particle-core';
          const duration = min + Math.random() * (max - min);
          particle.style.left = `${(i + Math.random()) / count * 100}%`;
          particle.style.setProperty('--size', `${config.type === 'snow' ? 3 + Math.random() * 5 : 7 + Math.random() * 5}px`);
          particle.style.setProperty('--duration', `${duration}s`);
          particle.style.setProperty('--delay', `${-Math.random() * duration}s`);
          particle.style.setProperty('--drift', `${Math.random() * 100 - 50}px`);
          particle.style.setProperty('--turn', `${Math.random() * 240 - 120}deg`);
          particle.style.setProperty('--sway', `${4 + Math.random() * 14}px`);
          particle.style.setProperty('--opacity', String(.35 + Math.random() * .35));
          core.style.backgroundColor = config.colors?.[i % config.colors.length] || '#FFFFFF';
          particle.append(core); fragment.append(particle);
        }
        layer.append(fragment); document.body.append(layer);
      }
      reduced.addEventListener('change', render);
      mobile.addEventListener('change', render);
      document.addEventListener('visibilitychange', render);
      cleanup = () => {
        reduced.removeEventListener('change', render);
        mobile.removeEventListener('change', render);
        document.removeEventListener('visibilitychange', render);
        removeLayer(); toggle?.remove();
      };
      render();
    }
  };
}
