import React, { useEffect, useRef, useState } from 'react';

const googleScriptUrl = 'https://accounts.google.com/gsi/client';

const loadGoogleScript = () => new Promise((resolve, reject) => {
  if (window.google?.accounts?.id) {
    resolve();
    return;
  }

  const existingScript = document.querySelector(`script[src="${googleScriptUrl}"]`);
  if (existingScript) {
    existingScript.addEventListener('load', resolve, { once: true });
    existingScript.addEventListener('error', reject, { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = googleScriptUrl;
  script.async = true;
  script.defer = true;
  script.onload = resolve;
  script.onerror = reject;
  document.body.appendChild(script);
});

const GoogleSignInButton = ({ onCredential, disabled = false }) => {
  const buttonRef = useRef(null);
  const [scriptError, setScriptError] = useState('');
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!clientId || disabled) {
      return undefined;
    }

    let isMounted = true;

    loadGoogleScript()
      .then(() => {
        if (!isMounted || !buttonRef.current) {
          return;
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => {
            if (response?.credential) {
              onCredential(response.credential);
            }
          },
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: 'continue_with',
          shape: 'rectangular',
          width: buttonRef.current.offsetWidth || 360,
        });
      })
      .catch(() => {
        if (isMounted) {
          setScriptError('Google sign-in could not load.');
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
