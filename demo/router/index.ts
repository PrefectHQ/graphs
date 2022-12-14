
import { RouteRecordRaw, createRouter, createWebHistory } from 'vue-router'
import { sections } from '../sections'
import { close } from './menu'
import { convertSectionToRouteRecords } from './routeRecords'

export const routeRecords: RouteRecordRaw[] = [
  {
    name: 'home',
    path: '/',
    // component: () => import('../sections/Home.vue'),
    redirect: {
      name: 'data',
    }
  },
  {
    name: 'data',
    path: '/data',
    component: () => import('../sections/Data.vue'),
  },
  ...convertSectionToRouteRecords(sections),
]

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