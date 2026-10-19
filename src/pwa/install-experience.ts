type InstallChoice = Readonly<{
  outcome: 'accepted' | 'dismissed';
  platform: string;
}>;

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
};

type NavigatorWithStandalone = Navigator & {
  standalone?: boolean;
};

export type InstallExperienceHandle = Readonly<{
  destroy: () => void;
}>;

function isStandalone(windowRef: Window, navigatorRef: Navigator): boolean {
  const navigatorWithStandalone = navigatorRef as NavigatorWithStandalone;
  return windowRef.matchMedia('(display-mode: standalone)').matches
    || navigatorWithStandalone.standalone === true;
}

function isIos(navigatorRef: Navigator): boolean {
  return /iPhone|iPad|iPod/i.test(navigatorRef.userAgent)
    || (navigatorRef.platform === 'MacIntel' && navigatorRef.maxTouchPoints > 1);
}

function setStatus(
  status: HTMLElement,
  action: HTMLButtonElement,
  message: string,
  actionLabel: string,
  actionDisabled: boolean
): void {
  status.textContent = message;
  action.textContent = actionLabel;
  action.disabled = actionDisabled;
}

export function mountInstallExperience(
  root: HTMLElement,
  windowRef: Window = window,
  navigatorRef: Navigator = navigator
): InstallExperienceHandle {
  const params = new URLSearchParams(windowRef.location.search);
  if (params.get('install') !== '1') {
    return { destroy: () => {} };
  }

  const panel = document.createElement('section');
  panel.dataset.installExperience = '';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', 'Install SNEK RENAISSANCE');
  Object.assign(panel.style, {
    position: 'absolute',
    left: '50%',
    bottom: 'max(24px, env(safe-area-inset-bottom))',
    zIndex: '20',
    width: 'min(520px, calc(100% - 32px))',
    transform: 'translateX(-50%)',
    display: 'grid',
    gap: '10px',
    padding: '16px 18px',
    border: '1px solid #d1d5db',
    borderRadius: '14px',
    background: 'rgba(255, 255, 255, 0.97)',
    boxShadow: '0 16px 48px rgba(17, 24, 39, 0.16)',
    color: '#111827'
  });

  const title = document.createElement('strong');
  title.textContent = 'INSTALL SNEK RENAISSANCE';

  const status = document.createElement('p');
  status.setAttribute('aria-live', 'polite');
  Object.assign(status.style, { margin: '0', color: '#4b5563', lineHeight: '1.4' });

  const action = document.createElement('button');
  action.type = 'button';
  Object.assign(action.style, {
    minHeight: '44px',
    border: '1px solid #2563eb',
    borderRadius: '10px',
    padding: '0 16px',
    background: '#2563eb',
    color: '#ffffff',
    fontWeight: '700'
  });

  panel.append(title, status, action);
  root.append(panel);

  let deferredPrompt: BeforeInstallPromptEvent | null = null;

  const showInstalled = (): void => {
    deferredPrompt = null;
    setStatus(status, action, 'Installed. Launch SNEK RENAISSANCE from your device.', 'INSTALLED', true);
  };

  const showManualFallback = (): void => {
    deferredPrompt = null;
    if (isIos(navigatorRef)) {
      setStatus(
        status,
        action,
        'On iPhone or iPad: open the Share menu, then choose Add to Home Screen.',
        'USE SHARE MENU',
        true
      );
      return;
    }

    setStatus(
      status,
      action,
      'If the install button stays unavailable, use your browser menu and choose Install app.',
      'WAITING FOR BROWSER',
      true
    );
  };

  const onBeforeInstallPrompt = (event: Event): void => {
    const promptEvent = event as BeforeInstallPromptEvent;
    promptEvent.preventDefault();
    deferredPrompt = promptEvent;
    setStatus(status, action, 'Ready. Use the browser-native install flow.', 'INSTALL', false);
  };

  const onAppInstalled = (): void => {
    showInstalled();
  };

  const onInstallClick = async (): Promise<void> => {
    if (!deferredPrompt) {
      showManualFallback();
      return;
    }

    action.disabled = true;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;

    if (choice.outcome === 'accepted') {
      setStatus(
        status,
        action,
        'Installation accepted. Complete the browser flow if it is still visible.',
        'INSTALLING',
        true
      );
      return;
    }

    setStatus(
      status,
      action,
      'Installation dismissed. Use the browser menu if you want to try again.',
      'USE BROWSER MENU',
      true
    );
  };

  action.addEventListener('click', onInstallClick);
  windowRef.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  windowRef.addEventListener('appinstalled', onAppInstalled);

  if (isStandalone(windowRef, navigatorRef)) {
    showInstalled();
  } else {
    showManualFallback();
  }

  return {
    destroy: () => {
      action.removeEventListener('click', onInstallClick);
      windowRef.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      windowRef.removeEventListener('appinstalled', onAppInstalled);
      panel.remove();
    }
  };
}
