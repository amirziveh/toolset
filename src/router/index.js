import { createRouter, createWebHistory } from 'vue-router';
import DashboardView from '../views/DashboardView.vue';
import ProformaMaker from '../views/ProformaMaker.vue';

const routes = [
  { path: '/', name: 'dashboard', component: DashboardView },
  { path: '/proforma', name: 'proforma', component: ProformaMaker },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;