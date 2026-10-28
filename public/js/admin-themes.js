import { createColorStudio } from '/js/admin-color-studio.js';
import { api, getSession } from '/js/app.js';
import { applyTheme, themeReady } from '/js/themes.js';
const panel = document.getElementById('appearancePanel');
const choices = document.getElementById('themeChoices');
const feedback = document.getElementById('themeFeedback');
const publish = document.getElementById('publishTheme');
const restore = document.getElementById('restoreTheme');
const preview = document.getElementById('previewTheme');
const frame = document.getElementById('themePreviewFrame');
let selected;
let canActivate = false;
let busy = false;
const studio = createColorStudio({ frame, onPublished: async () => { await load(); message('Tema ativado com sucesso. Visual publicado.'); }, onBusy: value => { busy = value; controls(); } });
function message(text, error = false) {
  feedback.textContent = text;
  feedback.className = `feedback ${error ? 'error' : 'success'}`;
}
function controls() {
  publish.disabled = restore.disabled = busy || !canActivate;
  preview.disabled = busy || !selected;
  choices.disabled = busy;
}
async function load() {
  await themeReady;
  const data = await api('/api/admin/themes');
  applyTheme({ ...data.themes.find(theme => theme.id === data.activeThemeId), customization: data.colorStudio?.themes?.[data.activeThemeId]?.published ?? null });
  studio.load(data);
  canActivate = data.canActivate;
  selected = data.activeThemeId;
  choices.replaceChildren();
  for (const theme of data.themes) {
    const label = document.createElement('label');
    label.className = 'theme-option';
    const input = document.createElement('input');
    input.type = 'radio'; input.name = 'appearanceTheme'; input.value = theme.id;
    input.checked = theme.id === selected;
    input.addEventListener('change', () => { selected = input.value; studio.select(selected); controls(); });
    const title = document.createElement('strong');
    title.textContent = theme.name + (theme.id === data.activeThemeId ? ' • Ativo' : '');
    const description = document.createElement('span'); description.textContent = theme.description;
    const swatches = document.createElement('span'); swatches.className = 'theme-swatches'; swatches.ariaHidden = 'true';
    for (const color of theme.colors) { const swatch = document.createElement('i'); swatch.style.backgroundColor = color; swatches.append(swatch); }
    if(theme.decoration){const image=document.createElement('img');image.className='theme-option-art';image.src=theme.decoration.src;image.alt='';image.width=240;image.height=120;image.loading='lazy';label.append(image);}
    label.dataset.theme=theme.id;
    label.append(input, title, description, swatches); choices.append(label);
  }
  if (data.warning) message(data.warning, true);
  controls();
}
async function activate(themeId) {
  busy = true; controls();
  feedback.className = 'feedback';
  feedback.textContent = 'Publicando tema...';
  try {
    await api('/api/admin/themes/active', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ themeId }) });
    frame.hidden = true; frame.removeAttribute('src');
    await load(); message('Tema ativado com sucesso. A loja usará este tema nas próximas visitas ou ao atualizar a página.');
  } catch (error) { message(error.message, true); }
  finally { busy = false; controls(); }
}
publish.addEventListener('click', () => studio.previewOnly ? activate(selected) : studio.publish());
restore.addEventListener('click', () => activate('artize'));
preview.addEventListener('click', () => studio.preview());
if (getSession()?.user?.role === 'admin') {
  panel.hidden = false;
  load().catch(error => { message(error.message, true); controls(); });
}
