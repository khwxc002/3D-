import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/three/AboutView.vue'),
    },
    {
      path: '/sse',
      name: 'sse',
      component: () => import('../views/sse/index.vue'),
    }, {
      path: '/maozhuxiaowu',
      name: 'maozhuxiaowu',
      component: () => import('../views/maozhuxiaowu/index.vue'),
    }, {
      path: '/guanzi',
      name: 'guanzi',
      component: () => import('../views/guanzi/index.vue'),
    }, {
      path: '/sheenChair',
      name: 'sheenChair',
      component: () => import('../views/sheenChair/index.vue'),
    }, {
      path: '/horse',
      name: 'horse',
      component: () => import('../views/horse/index.vue'),
    }, {
      path: '/sseGame',
      name: 'sseGame',
      component: () => import('../views/sseGame/index.vue'),
    }
  ],
})

export default router
