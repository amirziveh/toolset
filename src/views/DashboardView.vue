<script setup>
import { useRouter } from 'vue-router';
import { useInvoiceStore } from '../stores/invoice.js';
import { onMounted, computed } from 'vue';
import { _x, _e, _s, _checking, checkStoredLicense } from '../composables/useLicense.js';
import _PUB from '../utils/publicKey.js';

const router = useRouter();
const store = useInvoiceStore();

// License state
const licenseValid = _x;
const licenseExp = _e;
const licenseStatus = _s;
const licenseChecking = _checking;

// Calculate days remaining
const daysRemaining = computed(() => {
  if (!licenseValid.value || licenseExp.value === 0) return 0;
  const now = Date.now();
  const expMs = licenseExp.value * 1000;
  const diffMs = expMs - now;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
});

// License state computed values
const hasLicense = computed(() => licenseValid.value && licenseExp.value > 0);
const isExpired = computed(() => daysRemaining.value <= 0);
const isExpiringSoon = computed(() => daysRemaining.value > 0 && daysRemaining.value <= 7);
const licenseMessage = computed(() => {
  if (licenseChecking.value) return 'در حال بررسی مجوز...';
  if (!hasLicense.value) return 'مجوز معتبر یافت نشد';
  if (isExpired.value) return 'مجوز منقضی شده است';
  return `مجوز تا ${daysRemaining.value} روز دیگر معتبر است`;
});

// Initialize theme and license on mount
onMounted(async () => {
  store.initDarkMode();
  await checkStoredLicense(_PUB);
});

function navigateToProforma() {
  router.push('/proforma');
}
</script>

<template>
  <div class="min-h-screen flex flex-col p-6 sm:p-10" style="background: var(--bg)">
    <!-- Small License Badge - Top Left -->
    <div class="license-badge" :class="{ 'warning': isExpiringSoon, 'expired': isExpired, 'valid': hasLicense && !isExpiringSoon && !isExpired }" :title="licenseMessage">
      <i :class="{
        'fa-solid fa-check': hasLicense && !isExpiringSoon && !isExpired,
        'fa-solid fa-exclamation': isExpiringSoon,
        'fa-solid fa-xmark': isExpired,
        'fa-solid fa-spinner fa-spin': licenseChecking
      }"></i>
      <span v-if="hasLicense && !isExpired && !licenseChecking" class="license-days">{{ daysRemaining }} روز</span>
      <span v-else class="license-text">{{ licenseMessage }}</span>
    </div>

    <div class="w-full max-w-5xl flex flex-col min-h-[calc(100vh-4rem)]">
      
      <!-- Header -->
      <div class="text-center mb-10 sm:mb-12 relative">
       <button
          @click="store.toggleTheme()"
          class="theme-toggle-btn"
          :title="store.dark ? 'حالت روشن' : 'حالت تاریک'"
        >
          <i :class="store.dark ? 'fa-solid fa-moon' : 'fa-solid fa-sun'"></i>
        </button>
      </div>

      <!-- Content Area - Centers tool list vertically -->
      <div class="flex-1 flex items-center justify-center">
        <!-- App Cards Grid - Modern Dashboard Style -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          <!-- Proforma Button - Active -->
          <button
            @click="navigateToProforma"
            class="dashboard-card active group"
          >
            <div class="icon-box">
              <i class="fa-solid fa-file-invoice icon-style"></i>
            </div>
            <div class="text-box">
              <h3 class="card-title">پیش‌فاکتور داخلی</h3>
              <p class="card-desc">ایجاد و مدیریت پیش‌فاکتورها</p>
            </div>
            <div class="arrow-indicator">
              <i class="fa-solid fa-arrow-left-long"></i>
            </div>
          </button>

          <!-- Placeholder App 2 - Disabled -->
          <button disabled class="dashboard-card disabled">
            <div class="badge">به زودی</div>
            <div class="icon-box">
              <i class="fa-solid fa-box icon-style"></i>
            </div>
            <div class="text-box">
              <h3 class="card-title">پروفرما خارجی</h3>
              <p class="card-desc">در حال توسعه</p>
            </div>
          </button>

          <!-- Placeholder App 3 - Disabled -->
          <!-- <button disabled class="dashboard-card disabled">
            <div class="badge">به زودی</div>
            <div class="icon-box">
              <i class="fa-solid fa-chart-line icon-style"></i>
            </div>
            <div class="text-box">
              <h3 class="card-title">اپلیکیشن سوم</h3>
              <p class="card-desc">در حال توسعه</p>
            </div>
          </button> -->
        </div>
      </div>
      <footer class="pt-8 pb-4 flex items-center justify-center gap-2" style="margin-bottom: 0px;">
        <span class="powered-by-text">قدرت گرفته از دستیار تابان</span>
        <img src="/Taban.png" alt="Taban Assistant Logo" style="height: 24px; width: auto;" />
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Modern Dashboard Card Base */
.dashboard-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.25rem 1.5rem;
  border-radius: 16px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-family: 'IRANSansX', sans-serif;
  text-align: right;
  margin-bottom: 10px;
  margin-left: 1rem;
  margin-right: 1rem;
  outline: none;
}

/* Active Cards */
.dashboard-card.active {
  background: var(--card);
  border-color: var(--border, rgba(0,0,0,0.05));
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
}

/* Hover & Active states for Active Cards */
.dashboard-card.active:hover {
  transform: translateY(-4px);
  box-shadow: 0 10px 15px -1px rgba(0, 0, 0, 0.08), 0 4px 6px -2px rgba(0, 0, 0, 0.03);
  border-color: var(--accent);
}

.dashboard-card.active:active {
  transform: translateY(0px) scale(0.98);
}

/* Disabled Cards */
.dashboard-card.disabled {
  background: var(--input-bg, #f8fafc);
  border: 2px dashed var(--border, #e2e8f0);
  cursor: not-allowed;
  opacity: 0.7;
}

/* Icon Box */
.icon-box {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--input-bg, rgba(0,0,0,0.04));
  transition: background 0.3s ease;
}

.dashboard-card.active:hover .icon-box {
  background: var(--accent);
}

.icon-style {
  font-size: 1.25rem;
  color: var(--accent);
  transition: color 0.3s ease;
}

.dashboard-card.active:hover .icon-style {
  color: white;
}

.dashboard-card.disabled .icon-style {
  color: var(--muted);
}

/* Text Container */
.text-box {
  flex-grow: 1;
  min-width: 0; /* Prevents text overflow issues */
}

.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--fg);
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.card-desc {
  font-size: 0.8rem;
  font-weight: 400;
  color: var(--muted);
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Arrow Indicator (For active cards) */
.arrow-indicator {
  flex-shrink: 0;
  color: var(--muted);
  font-size: 0.9rem;
  opacity: 0;
  transform: translateX(-8px);
  transition: all 0.3s ease;
}

.dashboard-card.active:hover .arrow-indicator {
  opacity: 1;
  transform: translateX(0);
  color: var(--accent);
}

/* "Coming Soon" Badge */
.badge {
  position: absolute;
  top: 12px;
  left: 12px; /* RTL adjustment */
  background: var(--border, #e2e8f0);
  color: var(--muted);
  font-size: 0.65rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 6px;
}

/* Small License Badge - Top Left Corner */
.license-badge {
  position: fixed;
  top: 16px;
  left: 16px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 9999px;
  font-family: 'IRANSansX', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  z-index: 1000;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
  cursor: default;
  backdrop-filter: blur(8px);
}

.license-badge:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.license-badge.valid {
  background: rgba(5, 150, 105, 0.15);
  color: #059669;
  border: 1px solid rgba(5, 150, 105, 0.3);
}

.license-badge.warning {
  background: rgba(217, 119, 6, 0.15);
  color: #D97706;
  border: 1px solid rgba(217, 119, 6, 0.3);
}

.license-badge.expired {
  background: rgba(220, 38, 38, 0.15);
  color: #DC2626;
  border: 1px solid rgba(220, 38, 38, 0.3);
}

.license-badge i {
  font-size: 0.875rem;
}

.license-days {
  font-weight: 600;
}

.license-text {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Responsive Adjustments */
@media (max-width: 639px) {
  /* On very small screens, make cards slightly more compact */
  .dashboard-card {
    padding: 1rem 1.25rem;
  }
  
  .icon-box {
    width: 42px;
    height: 42px;
  }
  
  .icon-style {
    font-size: 1.1rem;
  }
  
  .card-title {
    font-size: 0.9rem;
  }
  
  .card-desc {
    font-size: 0.75rem;
  }
}

@media (min-width: 1024px) {
 /* On large screens, ensure cards look spacious */
  .dashboard-card {
    padding: 1.5rem;
  }
}

/* Theme Toggle Button */
.theme-toggle-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--input-bg, rgba(0,0,0,0.04));
  border: 1px solid var(--border, rgba(0,0,0,0.05));
  cursor: pointer;
  transition: all 0.2s ease;
  outline: none;
}

.theme-toggle-btn:hover {
  background: var(--accent);
  transform: translateY(-2px);
}

.theme-toggle-btn:hover i {
  color: white;
}

.theme-toggle-btn i {
  font-size: 1.1rem;
  color: var(--muted);
  transition: color 0.2s ease;
}

.powered-by-text {
  font-size: 0.7rem;
}
</style>