
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'
import { close } from '@/demo/router/menu'
import { convertSectionToRouteRecords } from '@/demo/router/routeRecords'
import { sections } from '@/demo/sections'

export const routeRecords: RouteRecordRaw[] = [
  {
    name: 'home',
    path: '/',
    component: () => import('@/demo/sections/WelcomePage.vue'),
  },
  ...convertSectionToRouteRecords(sections),
] as RouteRecordRaw[]

export const router = createRouter({
  history: createWebHistory(),
  routes: routeRecords,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }

    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth',
        top: +10,
      }
    }

    return { top: 0 }
  },
})

router.beforeEach(() => close())