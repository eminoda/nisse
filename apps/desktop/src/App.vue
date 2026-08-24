<script setup lang="ts">
import { onMounted, shallowRef } from "vue";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

const autoStart = shallowRef(false);
const isUpdatingAutoStart = shallowRef(false);

onMounted(async () => {
  try {
    autoStart.value = await isEnabled();
  } catch {
    autoStart.value = false;
  }
});

async function toggleAutoStart() {
  isUpdatingAutoStart.value = true;
  try {
    if (autoStart.value) {
      await disable();
      autoStart.value = false;
    } else {
      await enable();
      autoStart.value = true;
    }
  } finally {
    isUpdatingAutoStart.value = false;
  }
}
</script>

<template>
  <main class="runtime-shell">
    <header class="runtime-header">
      <div class="brand-lockup">
        <div class="brand-mark">n</div>
        <div>
          <p class="eyebrow">DESKTOP RUNTIME</p>
          <h1>nisse Runtime</h1>
        </div>
      </div>
      <div class="header-actions">
        <span class="version-label">v0.1.0</span>
        <span class="status-pill"><span class="status-dot"></span> Running</span>
      </div>
    </header>

    <section class="content-grid">
      <article class="hero-card">
        <div class="hero-orb" aria-hidden="true"><span>n</span></div>
        <div>
          <p class="eyebrow">LOCAL AI WORKSPACE</p>
          <h2>Your work companion is ready.</h2>
          <p class="hero-copy">
            nisse stays in the background and gives your browser the power to understand and act on
            your work.
          </p>
        </div>
      </article>

      <div class="status-stack">
        <article class="status-card">
          <div class="card-heading">
            <span class="card-icon card-icon--green">↗</span><span>Extension</span>
          </div>
          <strong>Disconnected</strong>
          <p>Open the nisse Chrome Extension to connect.</p>
        </article>
        <article class="status-card">
          <div class="card-heading"><span class="card-icon">✦</span><span>Agent</span></div>
          <strong class="muted-value">Not configured</strong>
          <p>Connect an AI model from the extension settings.</p>
        </article>
      </div>

      <article class="settings-card">
        <div>
          <p class="eyebrow">RUNTIME SETTINGS</p>
          <h3>Start with Windows</h3>
          <p>Keep nisse ready in the background when you sign in.</p>
        </div>
        <button
          class="toggle"
          :class="{ 'toggle--on': autoStart }"
          :disabled="isUpdatingAutoStart"
          :aria-pressed="autoStart"
          aria-label="切换 Windows 开机启动"
          @click="toggleAutoStart"
        >
          <span></span>
        </button>
      </article>
    </section>

    <footer class="runtime-footer">
      <span>127.0.0.1 · Local only</span>
      <span class="footer-ready"><span class="status-dot"></span> Runtime ready</span>
    </footer>
  </main>
</template>

<style>
:root {
  color-scheme: dark;
  --surface: #0d1117;
  --surface-raised: #151b24;
  --border: #202937;
  --border-strong: #2b3748;
  --text: #e8edf4;
  --text-secondary: #aab5c4;
  --muted: #667386;
  --accent: #67d5bd;
}

* {
  box-sizing: border-box;
}
html,
body,
#app {
  margin: 0;
  min-height: 100%;
}
body {
  background: var(--surface);
  color: var(--text);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
button {
  font: inherit;
}
.runtime-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.runtime-header {
  align-items: center;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  padding: 22px 34px;
}
.brand-lockup,
.header-actions,
.card-heading,
.footer-ready {
  align-items: center;
  display: flex;
}
.brand-lockup {
  gap: 12px;
}
.brand-mark {
  align-items: center;
  background: var(--accent);
  border-radius: 12px;
  color: #10211e;
  display: flex;
  font-family: Georgia, serif;
  font-size: 25px;
  font-weight: 700;
  height: 42px;
  justify-content: center;
  width: 42px;
}
.eyebrow {
  color: var(--accent);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  margin: 0 0 5px;
}
h1 {
  font-size: 18px;
  letter-spacing: -0.03em;
  margin: 0;
}
.header-actions {
  gap: 14px;
}
.version-label {
  color: var(--muted);
  font-size: 11px;
}
.status-pill {
  align-items: center;
  background: rgba(103, 213, 189, 0.1);
  border: 1px solid rgba(103, 213, 189, 0.22);
  border-radius: 999px;
  color: var(--accent);
  display: inline-flex;
  font-size: 11px;
  gap: 7px;
  padding: 6px 10px;
}
.status-dot {
  background: var(--accent);
  border-radius: 50%;
  display: inline-block;
  height: 7px;
  width: 7px;
}
.content-grid {
  display: grid;
  gap: 16px;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.8fr);
  margin: auto;
  max-width: 980px;
  padding: 42px 34px;
  width: 100%;
}
.hero-card {
  align-items: center;
  background:
    radial-gradient(circle at 15% 20%, rgba(103, 213, 189, 0.12), transparent 38%),
    var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 18px;
  display: flex;
  gap: 26px;
  grid-row: span 2;
  min-height: 276px;
  padding: 30px;
}
.hero-orb {
  align-items: center;
  background: rgba(103, 213, 189, 0.08);
  border: 1px solid rgba(103, 213, 189, 0.22);
  border-radius: 50%;
  display: flex;
  flex: 0 0 104px;
  height: 104px;
  justify-content: center;
}
.hero-orb span {
  color: var(--accent);
  font-family: Georgia, serif;
  font-size: 60px;
  font-weight: 700;
}
.hero-card h2 {
  font-size: 26px;
  letter-spacing: -0.05em;
  line-height: 1.12;
  margin: 0 0 13px;
  max-width: 310px;
}
.hero-copy {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.65;
  margin: 0;
  max-width: 350px;
}
.status-stack {
  display: grid;
  gap: 16px;
}
.status-card,
.settings-card {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: 15px;
  padding: 19px;
}
.card-heading {
  color: var(--text-secondary);
  font-size: 12px;
  gap: 9px;
  margin-bottom: 13px;
}
.card-icon {
  align-items: center;
  background: rgba(164, 144, 255, 0.12);
  border-radius: 7px;
  color: #a890ff;
  display: inline-flex;
  font-size: 14px;
  height: 24px;
  justify-content: center;
  width: 24px;
}
.card-icon--green {
  background: rgba(103, 213, 189, 0.11);
  color: var(--accent);
}
.status-card strong {
  display: block;
  font-size: 15px;
  margin-bottom: 5px;
}
.muted-value {
  color: var(--muted);
}
.status-card p,
.settings-card p:last-of-type {
  color: var(--muted);
  font-size: 11px;
  line-height: 1.5;
  margin: 0;
}
.settings-card {
  align-items: center;
  display: flex;
  grid-column: 1 / -1;
  justify-content: space-between;
}
.settings-card h3 {
  font-size: 14px;
  margin: 0 0 4px;
}
.toggle {
  background: var(--border-strong);
  border: 0;
  border-radius: 999px;
  cursor: pointer;
  height: 28px;
  padding: 3px;
  transition: background 150ms ease;
  width: 48px;
}
.toggle span {
  background: var(--muted);
  border-radius: 50%;
  display: block;
  height: 22px;
  transition:
    transform 150ms ease,
    background 150ms ease;
  width: 22px;
}
.toggle--on {
  background: rgba(103, 213, 189, 0.25);
}
.toggle--on span {
  background: var(--accent);
  transform: translateX(20px);
}
.toggle:disabled {
  cursor: wait;
  opacity: 0.65;
}
.runtime-footer {
  border-top: 1px solid var(--border);
  color: var(--muted);
  display: flex;
  font-size: 11px;
  justify-content: space-between;
  margin-top: auto;
  padding: 15px 34px;
}
.footer-ready {
  color: var(--accent);
  gap: 7px;
}
@media (max-width: 700px) {
  .runtime-header,
  .runtime-footer {
    padding-left: 22px;
    padding-right: 22px;
  }
  .content-grid {
    grid-template-columns: 1fr;
    padding: 28px 22px;
  }
  .hero-card {
    grid-row: auto;
  }
  .settings-card {
    grid-column: auto;
  }
}
</style>
