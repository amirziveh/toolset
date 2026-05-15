<script setup>
import { useInvoiceStore } from '@/stores/invoice';

const store = useInvoiceStore();
</script>

<template>
  <div class="card">
    <h3 class="font-extrabold text-sm mb-3 flex items-center gap-2" style="color:var(--accent)">
      <i class="fa-solid fa-user-tie"></i> اطلاعات خریدار
    </h3>
    <div class="space-y-2.5">
      <div>
        <label class="field-label">نام شرکت / خریدار</label>
        <input 
          v-model="store.currentInvoice.buyer.name" 
          class="input-field" 
          placeholder="نام شرکت یا شخص خریدار"
        >
      </div>
      <div>
        <label class="field-label">آدرس</label>
        <textarea 
          v-model="store.currentInvoice.buyer.address" 
          class="input-field" 
          rows="2" 
          placeholder="آدرس کامل"
        ></textarea>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="field-label">شماره ثبت</label>
          <input 
            v-model="store.currentInvoice.buyer.regNo" 
            class="input-field ltr" 
            placeholder="شماره ثبت"
          >
        </div>
        <div>
          <label class="field-label">کد اقتصادی</label>
          <input 
            v-model="store.currentInvoice.buyer.economicCode" 
            class="input-field ltr" 
            placeholder="کد اقتصادی"
          >
        </div>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="field-label">شناسه ملی</label>
          <input 
            v-model="store.currentInvoice.buyer.nationalId" 
            class="input-field ltr" 
            placeholder="شناسه ملی"
          >
        </div>
        <div>
          <label class="field-label">کد پستی</label>
          <input 
            v-model="store.currentInvoice.buyer.postalCode" 
            class="input-field ltr" 
            placeholder="کد پستی ۱۰ رقمی"
          >
        </div>
      </div>
      <div>
        <label class="field-label">تلفن</label>
        <input 
          v-model="store.currentInvoice.buyer.tel" 
          class="input-field ltr" 
          placeholder="شماره تماس"
        >
      </div>
    </div>
  </div>
</template>