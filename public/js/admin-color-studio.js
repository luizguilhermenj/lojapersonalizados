import { api } from '/js/app.js';
import { PALETTES, COLOR_FIELDS, GLOW_FIELDS, fromPalette, originalCustomization, validateCustomization, isHex, contrast } from '/js/color-studio.js';
const copy = value => value === null ? null : structuredClone(value);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function createColorStudio({ frame, onPublished, onBusy }) {
  const root = document.getElementById('colorStudio');
  const feedback = document.getElementById('studioFeedback');
  const colors = document.getElementById('studioColors');
  const state = document.getElementById('studioState');
  const tabs = [...root.querySelectorAll('[role="tab"]')];
  const compare = document.getElementById('compareOriginal');
  const size = document.getElementById('previewSize');
  let themes = [], selected, saved = {}, drafts = {}, writable = false, busy = false, ready = false;
  const invalidColors = new Set();
  const current = () => drafts[selected] ?? null;
  const theme = () => themes.find(t => t.id === selected);
  const tell = (text, error = false) => { feedback.textContent = text; feedback.className = `feedback ${error ? 'error' : 'success'}`; };
  function updateState() {
    const dirty = !same(current(), saved[selected]?.draft ?? null);
    const unpublished = !same(current(), saved[selected]?.published ?? null);
    state.textContent = dirty ? 'Alterações não salvas' : unpublished ? 'Rascunho salvo' : current() ? 'Visual publicado' : 'Visual original';
    document.getElementById('studioSettingsSummary').textContent = `${theme()?.name || ''} · ${state.textContent}. As configurações são independentes por tema.`;
    for (const id of ['saveStudio', 'publishStudio']) document.getElementById(id).disabled = busy || !writable || invalidColors.size > 0;
    for (const id of ['resetStudio','discardStudio']) document.getElementById(id).disabled = busy;
    root.querySelectorAll('input, .palette-choice').forEach(el => { el.disabled = busy; });
  }
  function sendPreview() {
    if (ready && frame.contentWindow && !frame.hidden) frame.contentWindow.postMessage({ type: 'artize:studio-preview', themeId: selected, customization: compare.checked ? null : current() }, location.origin);
  }
  function syncInputs() {
    const config = current() || originalCustomization(theme());
    for (const key of COLOR_FIELDS) {
      root.querySelector(`[data-color="${key}"]`).value = config[key];
      const hex = root.querySelector(`[data-hex="${key}"]`); hex.value = config[key]; hex.setCustomValidity(''); hex.removeAttribute('aria-invalid');
    }
    invalidColors.clear();
    for (const key of GLOW_FIELDS) document.getElementById(key).checked = config[key];
    document.getElementById('glowIntensity').value = config.glowIntensity;
    document.getElementById('glowValue').value = `${config.glowIntensity}%`;
    root.querySelectorAll('.palette-choice').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.palette === current()?.paletteId)));
    updateState(); sendPreview();
  }
  function edit(key, value) {
    drafts[selected] = validateCustomization({ ...(current() || originalCustomization(theme())), [key]: value, paletteId: null });
    const config = current();
    if (COLOR_FIELDS.includes(key)) {
      root.querySelector(`[data-color="${key}"]`).value = config[key];
      const hex = root.querySelector(`[data-hex="${key}"]`); hex.value = config[key]; hex.removeAttribute('aria-invalid'); hex.setCustomValidity(''); invalidColors.delete(key);
    }
    document.getElementById('glowValue').value = `${config.glowIntensity}%`;
    root.querySelectorAll('.palette-choice').forEach(button => button.setAttribute('aria-pressed','false'));
    updateState(); sendPreview();
    if (contrast(config.surface, config.text) < 4.5 || contrast(config.background, config.text) < 4.5) tell('O texto solicitado tem pouco contraste. A prévia ajusta as cores de leitura automaticamente.');
    else feedback.textContent = '';
  }
  const labels = { background: 'Fundo da loja', surface: 'Superfícies e cards', text: 'Textos', accent: 'Destaque', glowColor: 'Cor do glow' };
  for (const key of COLOR_FIELDS) {
    const field = document.createElement('div'); field.className = 'studio-color-field';
    const label = document.createElement('label'); label.htmlFor = `hex-${key}`; label.textContent = labels[key];
    const pair = document.createElement('div'); pair.className = 'studio-color-pair';
    const picker = document.createElement('input'); picker.type = 'color'; picker.dataset.color = key; picker.setAttribute('aria-label', `Escolher ${labels[key].toLowerCase()}`);
    const hex = document.createElement('input'); hex.type = 'text'; hex.id = `hex-${key}`; hex.className = 'field'; hex.dataset.hex = key; hex.maxLength = 7; hex.pattern = '#[0-9a-fA-F]{6}'; hex.spellcheck = false;
    picker.addEventListener('input', () => edit(key, picker.value));
    hex.addEventListener('input', () => {
      if (!isHex(hex.value)) { invalidColors.add(key); hex.setAttribute('aria-invalid','true'); hex.setCustomValidity('Use #RRGGBB.'); tell('Cor incompleta ou inválida. Use #RRGGBB antes de salvar ou publicar.',true); updateState(); return; }
      edit(key, hex.value);
    });
    pair.append(picker, hex); field.append(label,pair); colors.append(field);
  }
  for (const p of PALETTES) {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'palette-choice'; button.dataset.palette = p.id; button.setAttribute('aria-pressed','false');
    const swatches = document.createElement('span'); swatches.className = 'palette-swatches'; swatches.ariaHidden = 'true';
    for (const key of COLOR_FIELDS) { const swatch = document.createElement('i'); swatch.style.backgroundColor = p[key]; swatches.append(swatch); }
    const name = document.createElement('strong'); name.textContent = p.name;
    const hint = document.createElement('small'); hint.textContent = p.group === 'premium' ? 'Fundo escuro · Glow ajustável' : 'Tons suaves · Leve e acolhedor';
    button.append(swatches,name,hint);
    button.addEventListener('click', () => { drafts[selected] = fromPalette(p.id); syncInputs(); tell(`${p.name} aplicada à prévia. Nenhuma alteração publicada.`); });
    document.getElementById(p.group === 'premium' ? 'premiumPalettes' : 'softPalettes').append(button);
  }
  for (const key of GLOW_FIELDS) document.getElementById(key).addEventListener('change', event => edit(key, event.target.checked));
  document.getElementById('glowIntensity').addEventListener('input', event => edit('glowIntensity', Number(event.target.value)));
  function setTab(id, focus = false) {
    for (const tab of tabs) {
      const active = tab.id === `tab-${id}`;
      tab.setAttribute('aria-selected', String(active)); tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
      if (active && focus) tab.focus();
    }
    if (id === 'preview') showPreview();
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => setTab(tab.id.slice(4)));
    tab.addEventListener('keydown', event => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (target !== undefined) { event.preventDefault(); setTab(tabs[target].id.slice(4),true); }
    });
  });
  function sizePreview() {
    frame.style.width = size.value === 'mobile' ? '390px' : '1280px';
    frame.style.maxWidth = size.value === 'mobile' ? 'calc(100% - 2px)' : 'none';
  }
  function showPreview() {
    const url = `/pages/home.html?themePreview=${encodeURIComponent(selected)}&studioPreview=1`;
    if (frame.getAttribute('src') !== url) { ready = false; frame.src = url; }
    frame.hidden = false; sizePreview(); sendPreview();
  }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== frame.contentWindow || event.data?.type !== 'artize:studio-ready' || event.data.themeId !== selected) return;
    ready = true; sendPreview();
  });
  frame.addEventListener('load', sendPreview);
  compare.addEventListener('change', sendPreview); size.addEventListener('change', sizePreview);
  async function save(publish = false) {
    if (busy || !writable || invalidColors.size) return;
    const id = selected, config = copy(current());
    busy = true; onBusy(true); updateState(); tell(publish ? 'Publicando visual...' : 'Salvando rascunho...');
    try {
      await api(`/api/admin/themes/${encodeURIComponent(id)}/color-studio/${publish ? 'publish' : 'draft'}`, { method: 'PUT', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ customization: config }) });
      saved[id] = { draft: copy(config), published: publish ? copy(config) : saved[id]?.published ?? null };
      if (publish) { frame.hidden = true; frame.removeAttribute('src'); ready = false; await onPublished(); }
      tell(publish ? 'Visual publicado com sucesso. Atualize a loja para conferir.' : 'Rascunho salvo. A loja pública permanece igual.');
    } catch (error) { tell(error.message,true); }
    finally { busy = false; onBusy(false); updateState(); }
  }
  document.getElementById('saveStudio').addEventListener('click', () => save());
  document.getElementById('publishStudio').addEventListener('click', () => save(true));
  document.getElementById('resetStudio').addEventListener('click', () => { drafts[selected] = null; syncInputs(); tell('Padrão original restaurado na prévia. Publique para aplicar à loja.'); });
  document.getElementById('discardStudio').addEventListener('click', () => { drafts[selected] = copy(saved[selected]?.draft ?? null); syncInputs(); tell('Alterações não salvas descartadas.'); });
  window.addEventListener('beforeunload', event => {
    if (Object.keys(drafts).some(id => !same(drafts[id], saved[id]?.draft ?? null))) { event.preventDefault(); event.returnValue = ''; }
  });
  return {
    load(data) {
      const previousSaved = saved;
      const previousDrafts = drafts;
      themes = data.themes; saved = data.colorStudio?.themes || {}; writable = data.canActivate;
      drafts = Object.fromEntries(themes.map(t => [t.id, copy(Object.hasOwn(previousDrafts, t.id) && !same(previousDrafts[t.id], previousSaved[t.id]?.draft ?? null) ? previousDrafts[t.id] : saved[t.id]?.draft ?? null)]));
      selected = data.activeThemeId; compare.checked = false; syncInputs();
    },
    select(id) {
      selected = id; feedback.textContent = ''; compare.checked = false; ready = false;
      syncInputs(); if (!document.getElementById('studio-preview').hidden) showPreview();
      else { frame.hidden = true; frame.removeAttribute('src'); }
    },
    preview() { setTab('preview'); },
    publish() { return save(true); }
  };
}
