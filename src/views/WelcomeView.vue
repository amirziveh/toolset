<script setup>
import { useRouter } from 'vue-router';
import { useInvoiceStore } from '../stores/invoice';
import { onMounted } from 'vue';

const router = useRouter();
const store = useInvoiceStore();

onMounted(() => {
  store.initDarkMode();
});

function enterApp() {
  router.push('/dashboard');
}
</script>

<template>
  <div class="welcome-root">
    <div class="welcome-content">
      <!-- Logo -->
      <div class="logo-wrapper">
        <img src="/Taban.png" alt="Taban Assistant" class="logo-img" />
      </div>

      <!-- Title -->
      <h1 class="welcome-title">به جعبه ابزار خوش آمدید</h1>
      <p class="welcome-subtitle">دستیار تابان</p>

      <!-- Description -->
      <p class="welcome-desc">
        مجموعه ابزارهای حرفه‌ای برای مدیریت پیش‌فاکتورها و مستندات تجاری
      </p>

      <!-- Enter Button -->
      <button @click="enterApp" class="enter-btn">
        <span>ورود به برنامه</span>
        <i class="fa-solid fa-arrow-left-long"></i>
      </button>
    </div>

    <!-- Footer -->
    <footer class="welcome-footer">
      <span>قدرت گرفته از دستیار تابان</span>
    </footer>
  </div>
</template>

<style scoped>
.welcome-root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: var(--bg);
  padding: 2rem;
  position: relative;
  transition: background 0.3s;
}

.welcome-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  max-width: 400px;
  animation: fadeInUp 0.6s ease;
}

.logo-wrapper {
  width: 100px;
  height: 100px;
  border-radius: 24px;
  background: var(--card);
  border: 1px solid var(--card-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
  box-shadow: var(--shadow);
  padding: 1.25rem;
}

.logo-img {
  width: 100%;
  height: auto;
}

.welcome-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--fg);
  margin-bottom: 0.25rem;
}

.welcome-subtitle {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 1rem;
}

.welcome-desc {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.7;
  margin-bottom: 2.5rem;
}

.enter-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.75rem 2rem;
  border-radius: 12px;
  background: var(--accent);
  color: #fff;
  font-family: 'IRANSansX', sans-serif;
  font-weight: 700;
  font-size: 1rem;
  border: none;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 14px rgba(146, 64, 14, 0.3);
}

.enter-btn:hover {
  background: var(--accent-hover);
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(146, 64, 14, 0.4);
}

.enter-btn:active {
  transform: translateY(0);
}

.welcome-footer {
  position: absolute;
  bottom: 1.5rem;
  font-size: 0.7rem;
  color: var(--muted);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
