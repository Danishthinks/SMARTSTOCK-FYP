function _showMessage(container, text, type = 'error') {
  // container: DOM element to place message inside
  if (!container) return;
  let el = container.querySelector('.auth-message');
  if (!el) {
    el = document.createElement('div');
    el.className = 'auth-message';
    el.style.marginTop = '10px';
    el.style.fontSize = '13px';
    container.appendChild(el);
  }
  el.textContent = text;
  el.style.color = type === 'error' ? '#b00020' : '#0a7b00';
}

function _clearMessage(container) {
  if (!container) return;
  const el = container.querySelector('.auth-message');
  if (el) el.textContent = '';
}

function register() {
  const container = document.querySelector('.register-container');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const btn = container ? container.querySelector('button') : null;

  _clearMessage(container);

  if (!emailEl || !passwordEl) {
    _showMessage(container, 'Form inputs not found. Reload the page.', 'error');
    return;
  }

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email) { _showMessage(container, 'Please enter your email.'); return; }
  if (!password) { _showMessage(container, 'Please enter your password.'); return; }

  if (typeof auth === 'undefined') {
    _showMessage(container, 'Authentication is not available. Check Firebase initialization.', 'error');
    console.error('auth is undefined');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Creating account...'; }

  auth.createUserWithEmailAndPassword(email, password)
    .then(() => {
      _showMessage(container, 'Account created successfully. Redirecting to login...', 'success');
      setTimeout(() => window.location.href = 'login.html', 900);
    })
    .catch(err => {
      console.error('Register error:', err);
      _showMessage(container, err && err.message ? err.message : 'Registration failed', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Register'; }
    });
}

function login() {
  const container = document.querySelector('.login-container');
  const emailEl = document.getElementById('email');
  const passwordEl = document.getElementById('password');
  const btn = container ? container.querySelector('button') : null;

  _clearMessage(container);

  if (!emailEl || !passwordEl) {
    _showMessage(container, 'Form inputs not found. Reload the page.', 'error');
    return;
  }

  const email = emailEl.value.trim();
  const password = passwordEl.value;

  if (!email) { _showMessage(container, 'Please enter your email.'); return; }
  if (!password) { _showMessage(container, 'Please enter your password.'); return; }

  if (typeof auth === 'undefined') {
    _showMessage(container, 'Authentication is not available. Check Firebase initialization.', 'error');
    console.error('auth is undefined');
    return;
  }

  if (btn) { btn.disabled = true; btn.textContent = 'Logging in...'; }

  auth.signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential && userCredential.user;
      if (user) {
        console.log('Login successful, redirecting to dashboard...');
        window.location.href = 'index.html';
      } else {
        throw new Error('User verification failed');
      }
    })
    .catch(err => {
      console.error('Login error:', err);
      _showMessage(container, err && err.message ? err.message : 'Login failed', 'error');
      if (btn) { btn.disabled = false; btn.textContent = 'Login'; }
    });
}
