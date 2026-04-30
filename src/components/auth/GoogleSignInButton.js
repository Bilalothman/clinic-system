import React, { useEffect, useRef, useState } from 'react';

const googleScriptUrl = 'https://accounts.google.com/gsi/client';
const googleScriptId = 'google-identity-services';
const googleScriptTimeout = 10000;

const hasGoogleIdentity = () => Boolean(window.google?.accounts?.id);

const waitForGoogleIdentity = () => new Promise((resolve, reject) => {
  const startedAt = Date.now();

  const check = () => {
    if (hasGoogleIdentity()) {
      resolve();
      return;
    }

    if (Date.now() - startedAt >= googleScriptTimeout) {
      reject(new Error('Google Identity Services did not become available.'));
      return;
    }

    window.setTimeout(check, 50);
  };

  check();
});

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) {
    resolve();
    return;
  }

  const existingScript = document.getElementById(googleScriptId)
    || document.querySelector(`script[src="${googleScriptUrl}"]`);

  if (existingScript) {
    if (existingScript.dataset.loaded === 'true') {
      waitForGoogleIdentity().then(resolve).catch(reject);
      return;
    }

    if (existingScript.dataset.failed === 'true') {
      existingScript.remove();
    } else {
      existingScript.addEventListener('load', () => {
        waitForGoogleIdentity().then(resolve).catch(reject);
      }, { once: true });
      existingScript.addEventListener('error', reject, { once: true });
      return;
    }
  }

  const timeoutId = window.setTimeout(() => {
    reject(new Error('Timed out loading Google Identity Services.'));
  }, googleScriptTimeout);

  const script = document.createElement('script');
  script.id = googleScriptId;
  script.src = googleScriptUrl;
  script.async = true;
  script.defer = true;
  script.onload = () => {
    script.dataset.loaded = 'true';
    window.clearTimeout(timeoutId);
    waitForGoogleIdentity().then(resolve).catch(reject);
  };
  script.onerror = () => {
    script.dataset.failed = 'true';
    window.clearTimeout(timeoutId);
    reject(new Error('Google Identity Services failed to load.'));
  };
  document.body.appendChild(script);
});

const renderGoogleButton = ({ buttonElement, clientId, onCredential }) => {
  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (response?.credential) {
        onCredential(response.credential);
      }
    },
  });

  buttonElement.innerHTML = '';
  window.google.accounts.id.renderButton(buttonElement, {
    theme: 'outline',
    size: 'large',
    type: 'standard',
    text: 'continue_with',
    shape: 'rectangular',
    width: buttonElement.offsetWidth || 360,
  });
};

const GoogleSignInButton = ({ onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const [scriptError, setScriptError] = useState('');
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || disabled) {
      return undefined;
    }

    let isMounted = true;
    setScriptError('');

    loadGoogleScript()
      .then(() => {
        if (!isMounted || !buttonRef.current) {
          return;
        }

        renderGoogleButton({
          buttonElement: buttonRef.current,
          clientId,
          onCredential,
        });
      })
      .catch(() => {
        if (isMounted) {
          setScriptError('Google sign-in could not load. Check your internet connection, browser privacy settings, or OAuth origin configuration.');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clientId, disabled, onCredential]);

  if (!clientId) {
    return (
      <div className="google-auth-config-message">
        Add REACT_APP_GOOGLE_CLIENT_ID to enable Google sign-in.
      </div>
    );
  }

  return (
    <>
      <div
        className={`google-auth-button${disabled ? ' google-auth-button-disabled' : ''}`}
        ref={buttonRef}
      />
      {scriptError && <div className="google-auth-config-message">{scriptError}</div>}
    </>
  );
};

export default GoogleSignInButton;
