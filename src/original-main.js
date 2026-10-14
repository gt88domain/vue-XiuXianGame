import { createApp } from 'vue';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import ElementPlus from 'element-plus';
import { EditPen, Lock } from '@element-plus/icons-vue';
import 'element-plus/dist/index.css';
import 'normalize.css/normalize.css';
import OriginalGame from './OriginalGame.vue';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

createApp(OriginalGame)
    .use(pinia)
    .use(ElementPlus)
    .component('EditPen', EditPen)
    .component('Lock', Lock)
    .mount('#app');
