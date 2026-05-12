import {
  IonicVue,
  IonApp,
  IonRouterOutlet,
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel,
  IonFooter,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonItem,
  IonInput,
  IonCheckbox,
  IonBadge,
  IonModal,
  IonNote,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonAvatar,
  IonCard,
  IonIcon,
  IonBackButton,
} from '@ionic/vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import { Icon } from '@iconify/vue'
import App from './App.vue'
import router from './core/router'

/* Core CSS required for Ionic components to work properly */
import '@ionic/vue/css/core.css'

/* Basic CSS for apps built with Ionic */
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

/* Optional CSS utils that can be commented out */
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

/**
 * Ionic Dark Mode
 * -----------------------------------------------------
 * App is locked to light mode only.
 * Dark mode imports are intentionally disabled.
 */

/* @import '@ionic/vue/css/palettes/dark.always.css'; */
/* @import '@ionic/vue/css/palettes/dark.class.css'; */
/* @import '@ionic/vue/css/palettes/dark.system.css'; */

/* Theme variables */
import './core/theme/variables.css'

/* Global animation system */
import './core/theme/animations.css'
import './core/theme/global.css'
import '@aejkatappaja/phantom-ui/ssr.css'

const app = createApp(App).use(IonicVue).use(createPinia()).use(router)
app.component('Icon', Icon)

const ionicComponents = [
  IonApp,
  IonRouterOutlet,
  IonPage,
  IonContent,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonLabel,
  IonFooter,
  IonRefresher,
  IonRefresherContent,
  IonList,
  IonItem,
  IonInput,
  IonCheckbox,
  IonBadge,
  IonModal,
  IonNote,
  IonSearchbar,
  IonSegment,
  IonSegmentButton,
  IonSpinner,
  IonTextarea,
  IonAvatar,
  IonCard,
  IonIcon,
  IonBackButton,
]

for (const component of ionicComponents) {
  app.component(component.name, component)
}

// Mount regardless of whether the initial navigation succeeded or was aborted.
// A rejected isReady() (e.g. guard returning false on cold start) must not
// prevent the app from mounting — App.vue's boot sequence handles all gating.
router
  .isReady()
  .catch(() => {
    /* initial navigation aborted — App.vue will handle recovery */
  })
  .finally(() => {
    app.mount('#app')
  })
