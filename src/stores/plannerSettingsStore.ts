import { defineStore } from 'pinia';

export interface IPlannerSettings {
    showUnreleasedArcanists: boolean;
    showOwnedArcanists: boolean;
    enableWilderness: boolean;
    enableLowRunCards: boolean;
    /**
     * The max story stage. Can be a stage code like '4-21H' or the string 'any'.
     * The value 'any' is translated using the i18n key 'planner-no-max-stage-label'.
     */
    maxStoryStage: string;
    maxDustStage: string;
    maxSharpodontyStage: string;
}

interface IPlannerSettingsStore {
    settings: IPlannerSettings;
}

// NOTE: if we need to add new version drops data, please check the getDrops, initializeWarehouse and checkWarehouse functions
// refer to keyword: enabledUnreleasedStages_v1_7

export const usePlannerSettingsStore = defineStore('plannerSettings', {
    state: (): IPlannerSettingsStore => ({
        settings: {
            showUnreleasedArcanists: false,
            showOwnedArcanists: false,
            enableWilderness: true,
            enableLowRunCards: true,
            maxStoryStage: 'any',
            maxDustStage: 'any',
            maxSharpodontyStage: 'any'
        }
    }),
    persist: true
});