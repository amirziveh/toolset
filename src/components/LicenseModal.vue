<script setup>
import { ref, watch } from 'vue';
import { verifyLicenseKey, _s, _x } from '../composables/useLicense.js';
import _PUB from '../utils/publicKey.js';
const props = defineProps({
  show: { type: Boolean, default: false },
});
const emit = defineEmits(['close', 'verified']);
console.log('[LicenseModal] Component loaded, show prop:', props.show);
const keyInput = ref('');
const loading = ref(false);
const errorType = ref(''); // 'expired' | 'tampered' | 'clock' | 'format'
const success = ref(false);
watch(
  () => props.show,
  (v) => {
    console.log('[LicenseModal] show prop changed to:', v);
    if (v) {
      keyInput.value = '';
      errorType.value = '';
      success.value = false;
      loading.value = false;
    }
  },
  { immediate: true }
);
async function handleVerify() {
  const raw = keyInput.value.trim();
  if (!raw) {
    errorType.value = 'format';
    success.value = false;
    return;
  }
  loading.value = true;
  errorType.value = '';
  success.value = false;
  const result = await verifyLicenseKey(raw, _PUB);
  loading.value = false;
  if (result.valid) {
    success.value = true;
    errorType.value = '';
    // Notify parent after a short delay so the user sees the success state
    setTimeout(() => { emit('verified', result); }, 800);
  } else if (result.clockManipulated) {
    errorType.value = 'clock';
  } else if (result.expired) {
    errorType.value = 'expired';
  } else if (result.tampered) {
    errorType.value = 'tampered';
  } else {
    errorType.value = 'format';
  }
}
function close() {
  if (success.value || _x.value) {
    emit('close');
  }
}
</script>
<template>
  <!-- SIMPLIFIED VERSION - no Teleport, no nested Transitions -->
  <div v-if="show" style="position: fixed; inset: 0; z-index: 9999; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5);" @click.self="close">
    <div style="background: white; border-radius: 16px; padding: 24px; max-width: 448px; width: 100%; margin: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.25);">
      <!-- Header -->
      <div style="display: flex; align-items: center; justify-content: between; margin-bottom: 20px;">
        <h2 style="font-size: 18px; font-weight: bold; color: #1C1917;">فعال‌سازی مجوز</h2>
        <button @click="close" style="width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 50%; border: none; background: none; cursor: pointer; color: #78716C;" type="button">
          ✕
        </button>
      </div>
      <!-- Instructions -->
      <p style="font-size: 14px; margin-bottom: 16px; color: #78716C; line-height: 1.6;">
        کد مجوز (لایسنس) خود را در کادر زیر وارد کنید.
      </p>
      <!-- Textarea -->
      <textarea
        v-model="keyInput"
        rows="4"
        style="width: 100%; padding: 12px; border: 1px solid #D6CFC7; border-radius: 8px; font-family: 'Courier New', monospace; font-size: 12px; direction: ltr; text-align: left; resize: none; margin-bottom: 12px;"
        placeholder="PASTE LICENSE KEY HERE..."
        :disabled="loading || success"
      ></textarea>
      <!-- Error messages -->
      <div v-if="errorType" style="margin-top: 12px;">
        <p v-if="errorType === 'expired'" style="color: #DC2626; font-size: 14px; display: flex; align-items: center; gap: 8px;">
          ⏰ منقضی شده
        </p>
        <p v-if="errorType === 'tampered'" style="color: #DC2626; font-size: 14px; display: flex; align-items: center; gap: 8px;">
          ⚠️ دستکاری شده
        </p>
        <p v-if="errorType === 'clock'" style="color: #DC2626; font-size: 14px; display: flex; align-items: center; gap: 8px;">
          ⚠️ دستکاری ساعت سیستم تشخیص داده شد
        </p>
        <p v-if="errorType === 'format'" style="color: #DC2626; font-size: 14px; display: flex; align-items: center; gap: 8px;">
          ⚠️ فرمت نامعتبر
        </p>
      </div>
      <!-- Success message -->
      <div v-if="success" style="margin-top: 12px;">
        <p style="color: #059669; font-size: 14px; display: flex; align-items: center; gap: 8px;">
          ✓ مجوز با موفقیت فعال شد
        </p>
      </div>
      <!-- Verify button -->
      <button
        @click="handleVerify"
        :disabled="loading || success"
        style="width: 100%; margin-top: 20px; padding: 12px; background: #D97706; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;"
        :style="{ opacity: (loading || success) ? 0.6 : 1 }"
      >
        <template v-if="loading">
          <span style="display: inline-block; animation: spin 1s linear infinite;">⟳</span>
          در حال بررسی ...
        </template>
        <template v-else-if="success">✓ فعال شد</template>
        <template v-else>بررسی و فعال‌سازی</template>
      </button>
    </div>
  </div>
</template>
<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>