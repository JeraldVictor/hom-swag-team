import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./core/router";

import { IonicVue } from "@ionic/vue";

/* Core CSS required for Ionic components to work properly */
import "@ionic/vue/css/core.css";

/* Basic CSS for apps built with Ionic */
import "@ionic/vue/css/normalize.css";
import "@ionic/vue/css/structure.css";
import "@ionic/vue/css/typography.css";

/* Optional CSS utils that can be commented out */
import "@ionic/vue/css/padding.css";
import "@ionic/vue/css/float-elements.css";
import "@ionic/vue/css/text-alignment.css";
import "@ionic/vue/css/text-transformation.css";
import "@ionic/vue/css/flex-utils.css";
import "@ionic/vue/css/display.css";

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
import "./core/theme/variables.css";

/* Global animation system */
import "./core/theme/animations.css";
import "./core/theme/global.css";
import "@aejkatappaja/phantom-ui/ssr.css";

const app = createApp(App).use(IonicVue).use(createPinia()).use(router);

router.isReady().then(() => {
  app.mount("#app");
});
