<template>
  <div class="login-wrapper">
    <!-- Decorative background blobs -->
    <div class="hero-bg-top" aria-hidden="true"></div>
    <div class="hero-bg-bottom" aria-hidden="true"></div>

    <div class="login-card">
      <div class="login-brand">
        <span class="brand-name">Wishlist</span>
      </div>
      <p class="login-subtitle">
        Condividi la tua Wishlist con amici e famiglia
      </p>

      <div class="provider-list">
        <button class="provider-btn" @click="auth.login('google')">
          <svg class="provider-icon" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span class="provider-label">Continua con Google</span>
          <span class="material-symbols-outlined provider-chevron">chevron_right</span>
        </button>

        <button class="provider-btn" @click="auth.login('github')">
          <svg class="provider-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
          </svg>
          <span class="provider-label">Continua con GitHub</span>
          <span class="material-symbols-outlined provider-chevron">chevron_right</span>
        </button>

        <button class="provider-btn" @click="auth.login('microsoft')">
          <svg class="provider-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"/>
          </svg>
          <span class="provider-label">Continua con Microsoft</span>
          <span class="material-symbols-outlined provider-chevron">chevron_right</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-background);
  position: relative;
  overflow: hidden;
}

/* Decorative blobs */
.hero-bg-top {
  position: absolute;
  top: -10%;
  right: -10%;
  width: 60%;
  height: 60%;
  border-radius: var(--radius-full);
  background: var(--color-surface-container-high);
  filter: blur(120px);
  opacity: 0.4;
  pointer-events: none;
}

.hero-bg-bottom {
  position: absolute;
  bottom: -10%;
  left: -10%;
  width: 50%;
  height: 50%;
  border-radius: var(--radius-full);
  background: var(--color-secondary-container);
  filter: blur(100px);
  opacity: 0.4;
  pointer-events: none;
}

/* Login card */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  background: var(--color-surface-container-lowest);
  border-radius: var(--radius-2xl);
  padding: 2.5rem;
  box-shadow: 0px 12px 32px rgba(27, 28, 25, 0.06);
  outline: 1px solid rgba(192, 200, 199, 0.15);
}

.login-brand {
  text-align: center;
  margin-bottom: 0.5rem;
}

.brand-name {
  font-family: var(--font-headline);
  font-style: italic;
  font-size: 2rem;
  font-weight: 600;
  color: var(--color-primary);
}

.login-subtitle {
  color: var(--color-on-surface-variant);
  font-size: 0.95rem;
  text-align: center;
  margin-bottom: 2rem;
}

/* Provider buttons */
.provider-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.provider-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--color-surface-container-low);
  color: var(--color-on-surface);
  border-radius: var(--radius-xl);
  padding: 1rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  font-family: var(--font-body);
  border: none;
  cursor: pointer;
  transition: background 0.15s;
  text-align: left;
}

.provider-btn:hover {
  background: var(--color-surface-container-high);
}

.provider-icon {
  flex-shrink: 0;
}

.provider-label {
  flex: 1;
}

.provider-chevron {
  color: var(--color-outline);
  font-size: 1.1rem;
  flex-shrink: 0;
}

@media (max-width: 767px) {
  .login-card {
    max-width: 100%;
    margin: 1rem;
    padding: 1.5rem;
    border-radius: var(--radius-xl);
  }

  .hero-bg-top {
    width: 40%;
    height: 40%;
    filter: blur(60px);
  }

  .hero-bg-bottom {
    width: 35%;
    height: 35%;
    filter: blur(50px);
  }

  .provider-btn {
    min-height: 56px;
  }
}
</style>

