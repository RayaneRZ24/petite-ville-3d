function bindSettingsPanel(document) {
  const panel = document.getElementById('controls');
  const toggle = document.getElementById('settings-toggle');
  const close = document.getElementById('settings-close');
  const backdrop = document.getElementById('settings-backdrop');
  const setOpen = open => {
    panel.classList.toggle('is-open', open);
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    toggle.setAttribute('aria-expanded', String(open));
    backdrop.hidden = !open;
    if (open) close.focus();
    else toggle.focus();
  };
  toggle.addEventListener('click', () => setOpen(panel.inert));
  close.addEventListener('click', () => setOpen(false));
  backdrop.addEventListener('click', () => setOpen(false));
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
    if (event.key === 'Tab') {
      const items = [...panel.querySelectorAll('button, select, input, a[href]')].filter(el => el.getClientRects().length);
      const destination = event.shiftKey && document.activeElement === items[0] ? items.at(-1)
        : !event.shiftKey && document.activeElement === items.at(-1) ? items[0] : null;
      if (destination) { event.preventDefault(); destination.focus(); }
    }
  });
  return { setOpen };
}
