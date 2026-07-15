(function () {
  'use strict';

  if (document.getElementById('site-shell')) return;

  const PLAYER_TOKEN_KEY = 'sportchat_player_token';
  const PLAYER_NAME_KEY = 'sportchat_player_name';
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  const isAdminPage = currentPage === 'admin-results.html';

  const pages = [
    { href: 'index.html', label: 'Рейтинг' },
    { href: 'predictions.html', label: 'Не зроблені прогнози' },
    { href: 'surprises.html', label: 'Неочікувані матчі' },
    { href: 'admin-results.html', label: 'Адмін-сторінка' }
  ];

  const menuIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const closeIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const userIcon = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  const root = document.createElement('div');
  root.id = 'site-shell';
  root.innerHTML = `
    <header class="site-shell">
      <div class="site-shell__bar">
        <div class="site-shell__left">
          <button id="site-shell-menu-button" class="site-shell__button" type="button" aria-label="Відкрити меню" aria-controls="site-shell-drawer" aria-expanded="false">${menuIcon}</button>
          <a class="site-shell__brand" href="index.html">Sportchat Predict</a>
        </div>
        <a id="site-shell-account" class="site-shell__account" href="personal-cabinet.html" aria-label="Особистий кабінет">
          <span id="site-shell-avatar" class="site-shell__avatar">${userIcon}</span>
          <span id="site-shell-account-name" class="site-shell__account-name" hidden></span>
        </a>
      </div>
    </header>
    <button id="site-shell-backdrop" class="site-shell__backdrop" type="button" aria-label="Закрити меню" aria-hidden="true" tabindex="-1"></button>
    <aside id="site-shell-drawer" class="site-shell__drawer" aria-label="Головне меню" aria-hidden="true">
      <div class="site-shell__drawer-head">
        <div>
          <div class="site-shell__drawer-title">Меню</div>
          <div class="site-shell__drawer-subtitle">Sportchat Predict</div>
        </div>
        <button id="site-shell-close-button" class="site-shell__close" type="button" aria-label="Закрити меню">${closeIcon}</button>
      </div>
      <nav class="site-shell__nav" aria-label="Сторінки сайту">
        ${pages.map(page => `<a class="site-shell__link" href="${page.href}">${page.label}</a>`).join('')}
      </nav>
      <div class="site-shell__drawer-foot">Оберіть потрібний розділ. Особистий кабінет завжди доступний у правому верхньому куті.</div>
    </aside>`;

  document.body.prepend(root);

  const menuButton = document.getElementById('site-shell-menu-button');
  const closeButton = document.getElementById('site-shell-close-button');
  const backdrop = document.getElementById('site-shell-backdrop');
  const drawer = document.getElementById('site-shell-drawer');
  const account = document.getElementById('site-shell-account');
  const avatar = document.getElementById('site-shell-avatar');
  const accountName = document.getElementById('site-shell-account-name');

  drawer.querySelectorAll('.site-shell__link').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('is-active');
      link.setAttribute('aria-current', 'page');
    }
    link.addEventListener('click', () => closeMenu(false));
  });

  function safeSessionValue(key) {
    try {
      return sessionStorage.getItem(key) || '';
    } catch (_) {
      return '';
    }
  }

  function refreshAccount() {
    const playerToken = safeSessionValue(PLAYER_TOKEN_KEY);
    const playerName = safeSessionValue(PLAYER_NAME_KEY).trim();
    const showPlayerName = !isAdminPage && Boolean(playerToken && playerName);

    account.classList.toggle('is-authenticated', showPlayerName);
    accountName.hidden = !showPlayerName;

    if (showPlayerName) {
      accountName.textContent = playerName;
      avatar.textContent = playerName.charAt(0);
      account.setAttribute('aria-label', `Особистий кабінет: ${playerName}`);
      account.title = `Особистий кабінет: ${playerName}`;
    } else {
      accountName.textContent = '';
      avatar.innerHTML = userIcon;
      account.setAttribute('aria-label', 'Особистий кабінет');
      account.title = 'Особистий кабінет';
    }
  }

  function openMenu() {
    drawer.classList.add('is-open');
    backdrop.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
    backdrop.setAttribute('aria-hidden', 'false');
    menuButton.setAttribute('aria-expanded', 'true');
    document.body.classList.add('site-shell-menu-open');
    closeButton.focus();
  }

  function closeMenu(returnFocus = true) {
    drawer.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    drawer.setAttribute('aria-hidden', 'true');
    backdrop.setAttribute('aria-hidden', 'true');
    menuButton.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('site-shell-menu-open');
    if (returnFocus) menuButton.focus();
  }

  function trapFocus(event) {
    if (!drawer.classList.contains('is-open') || event.key !== 'Tab') return;
    const focusable = Array.from(drawer.querySelectorAll('a[href], button:not([disabled])'));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  menuButton.addEventListener('click', openMenu);
  closeButton.addEventListener('click', () => closeMenu());
  backdrop.addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && drawer.classList.contains('is-open')) closeMenu();
    trapFocus(event);
  });
  window.addEventListener('pageshow', refreshAccount);
  window.addEventListener('focus', refreshAccount);

  window.SportchatShell = { refreshAccount, openMenu, closeMenu };
  refreshAccount();
})();
