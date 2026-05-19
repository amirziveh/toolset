import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import ProformaMaker from '../views/ProformaMaker.vue';
import { _x, _checking, checkStoredLicense } from '../composables/useLicense.js';
import _PUB from '../utils/publicKey.js';

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/proforma', name: 'proforma', component: ProformaMaker },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

/**
 * Wait for license check to complete.
 * If check hasn't started, trigger it first.
 */
async function waitForLicenseCheck() {
  // If already checked, return immediately
  if (!_checking.value) {
    return true;
  }

  // If check is in progress, wait for it
  if (_checking.value) {
    // Start the license check if it hasn't been started
    // (it's triggered in App.vue's onMounted, but that happens after router guard)
    checkStoredLicense(_PUB);

    // Wait for the check to complete (poll every 50ms, max 2000ms)
    let attempts = 0;
    while (_checking.value && attempts < 40) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts++;
    }
  }

  return true;
}

router.beforeEach(async (to, from) => {
  // Wait for license check to complete before making a decision
  await waitForLicenseCheck();

  // No valid license — redirect to root (shows modal via App.vue)
  // Store the intended route for redirection after license verification
  if (!_x.value) {
    // Return an object with the redirect path and state containing the intended route
    return {
      path: '/',
      state: { intendedRoute: to.fullPath },
    };
  }

  // Valid license — allow navigation
});

export default router;