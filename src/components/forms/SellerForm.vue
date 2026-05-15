<script setup>
import { ref, watch } from 'vue';
import { useInvoiceStore } from '@/stores/invoice';

const store = useInvoiceStore();
const logoInput = ref(null);

// Get dominant color from image
function getDominantColor(img) {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    const centerIndex = (Math.floor(canvas.width/2) + Math.floor(canvas.height/2) * canvas.width) * 4;
    const r = data[centerIndex];
    const g = data[centerIndex+1];
    const b = data[centerIndex+2];
    return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
  } catch(e) {
    return null;
  }
}

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0,2), 16);
  const g = parseInt(hex.substring(2,4), 16);
  const b = parseInt(hex.substring(4,6), 16);
  return {r, g, b};
}

function blendColors(color1, color2, weight2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  const w1 = 1 - weight2;
  const r = Math.round(rgb1.r * w1 + rgb2.r * weight2);
  const g = Math.round(rgb1.g * w1 + rgb2.g * weight2);
  const b = Math.round(rgb1.b * w1 + rgb2.b * weight2);
  return '#' + ((1<<24)+(r<<16)+(g<<8)+b).toString(16).slice(1);
}

// Handle logo file upload
function handleLogoFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  if (file.size > 2*1024*1024) {
    alert('حجم فایل باید کمتر از ۲ مگابایت باشد');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    store.currentInvoice.seller.logoImage = e.target.result;
    
    // Extract color from logo
    const img = new Image();
    img.onload = function() {
      const color = getDominantColor(img);
      if (color) {
        store.currentInvoice.seller.logoColor = color;
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function removeLogo() {
  store.currentInvoice.seller.logoImage = '';
  store.currentInvoice.seller.logoColor = '';
  if (logoInput.value) logoInput.value.value = '';
}

// Save as default seller
function saveDefaultSeller() {
  store.saveDefaultSeller();
}
</script>

<template>
  <div class="card">
    <h3 class="font-extrabold text-sm mb-3 flex items-center gap-2" style="color:var(--accent)">
      <i class="fa-solid fa-building"></i> اطلاعات فروشنده
    </h3>
    <div class="space-y-2.5">
      <div>
        <label class="field-label">نام شرکت / فروشگاه</label>
        <input 
          v-model="store.currentInvoice.seller.name" 
          class="input-field" 
          placeholder="نام شرکت یا کسب‌وکار شما"
        >
      </div>
      <div>
        <label class="field-label">آدرس</label>
        <textarea 
          v-model="store.currentInvoice.seller.address" 
          class="input-field" 
          rows="2" 
          placeholder="آدرس کامل"
        ></textarea>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="field-label">شماره ثبت</label>
          <input 
            v-model="store.currentInvoice.seller.regNo" 
            class="input-field ltr" 
            placeholder="مثلاً ۱۲۳۴۵"
          >
        </div>
        <div>
          <label class="field-label">کد اقتصادی</label>
          <input 
            v-model="store.currentInvoice.seller.economicCode" 
            class="input-field ltr" 
            placeholder="کد اقتصادی"
          >
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="field-label">شناسه ملی</label>
          <input 
            v-model="store.currentInvoice.seller.nationalId" 
            class="input-field ltr" 
            placeholder="شناسه ملی ۱۱ رقمی"
          >
        </div>
        <div>
          <label class="field-label">تلفن</label>
          <input 
            v-model="store.currentInvoice.seller.tel" 
            class="input-field ltr" 
            placeholder="۰۲۱-۱۲۳۴۵۶۷۸"
          >
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="field-label">فکس</label>
          <input 
            v-model="store.currentInvoice.seller.fax" 
            class="input-field ltr" 
            placeholder="شماره فکس"
          >
        </div>
        <div>
          <label class="field-label">لوگوی شرکت</label>
          <div class="flex gap-2 items-center">
            <button 
              @click="logoInput?.click()" 
              class="btn btn-secondary btn-sm flex-shrink-0"
            >
              <i class="fa-solid fa-image"></i> انتخاب
            </button>
            <span class="text-xs truncate" style="color:var(--muted)">
              {{ store.currentInvoice.seller.logoImage ? 'لوگو بارگذاری شده' : 'فایلی انتخاب نشده' }}
            </span>
            <button 
              v-if="store.currentInvoice.seller.logoImage"
              @click="removeLogo" 
              class="btn btn-danger btn-sm flex-shrink-0"
            >
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
          <input 
            ref="logoInput"
            type="file" 
            accept="image/*" 
            class="hidden" 
            @change="handleLogoFile"
          >
        </div>
      </div>
      <div class="flex items-center gap-2">
        <label class="toggle-switch">
          <input 
            type="checkbox" 
            v-model="store.currentInvoice.showSellerNameLogo"
          >
          <span class="toggle-slider"></span>
        </label>
        <span class="text-sm font-semibold">نمایش نام شرکت در کنار لوگو</span>
      </div>
      <button 
        @click="saveDefaultSeller" 
        class="btn btn-secondary btn-sm"
      >
        <i class="fa-solid fa-thumbtack"></i> ذخیره به‌عنوان پیش‌فرض
      </button>
    </div>
  </div>
</template>

<style scoped>
.toggle-switch {
  position: relative;
  width: 40px;
  height: 22px;
  cursor: pointer;
  display: inline-block;
  flex-shrink: 0;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
  position: absolute;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: var(--input-border);
  border-radius: 11px;
  transition: .3s;
}

.toggle-slider::before {
  content: '';
  position: absolute;
  height: 16px;
  width: 16px;
  right: 3px;
  bottom: 3px;
  background: #fff;
  border-radius: 50%;
  transition: .3s;
}

.toggle-switch input:checked+.toggle-slider {
  background: var(--accent);
}

.toggle-switch input:checked+.toggle-slider::before {
  transform: translateX(-18px);
}
</style>