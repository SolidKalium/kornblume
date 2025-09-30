import { defineStore } from 'pinia';

export const usePlannerStagesStore = defineStore('plannerStages', {
    state: () => ({
        settings: {
            // Define default settings here
        }
    }),
    actions: {
        setSettings(settings) {
            this.settings = settings;
        }
    },
    persist: true
});
