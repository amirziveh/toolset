<script setup>
import { provide, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { _x, _s, _p, checkStoredLicense, _checking } from './composables/useLicense.js';
import _PUB from './utils/publicKey.js';
import LicenseModal from './components/LicenseModal.vue';


const router = useRouter();
const route = useRoute();

/** Controls the LicenseModal visibility */
const showModal = ref(false);

/** Stores the intended route for redirection after license verification */
const intendedRoute = ref(null);

/**
 * Open the license activation modal.
 * @param {object} route - The intended route to navigate to after license verification
 */
function openLicenseModal(route = null) {
  showModal.value = true;
  intendedRoute.value = route;
}

/**
 * Called when the LicenseModal emits 'verified'.
 */
function onLicenseVerified() {
  showModal.value = false;
  // Navigate to the originally intended route, or dashboard as fallback
  const redirectPath = intendedRoute.value?.path || '/dashboard';
  router.push(redirectPath);
  intendedRoute.value = null;
}

// ── Silently verify stored license on mount ─────────────────────────────
onMounted(async () => {

  // If license check is already in progress (started by router guard), wait for it
  if (_checking.value) {
    let attempts = 0;
    while (_checking.value && attempts < 40) {
      await new Promise((resolve) => setTimeout(resolve, 50));
      attempts++;
    }
  }

  // If already verified, just hide the modal
  if (_x.value) {
    
    showModal.value = false;
    return;
  }

 
  // Check if there's an intended route in router state
  const stateRoute = router.currentRoute.value.state?.intendedRoute;
  if (stateRoute) {
    intendedRoute.value = { path: stateRoute };
  }
  showModal.value = true;
});

// ── Provide license state to descendants ───────────────────────────────
provide('license', {
  isPro: _x,
  status: _s,
  phone: _p,
  openLicenseModal,
});
</script>

<template>
  <div class="app-container">
    <router-view />

    <LicenseModal
      :show="showModal"
      @verified="onLicenseVerified"
    />
  </div>
</template>

<style scoped>
.app-container {
  position: relative;
  min-height: 100vh;
}
</style>
