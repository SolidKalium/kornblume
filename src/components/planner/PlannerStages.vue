<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePlannerSettingsStore } from '../../stores/plannerSettingsStore';
import { useDataStore } from '../../stores/dataStore';


interface IStage {
    code: string;
    chapter: number;
    stage: number;
}

const emit = defineEmits(['closeOverlay']);


const plannerSettingsStore = usePlannerSettingsStore();
const stageStore = useDataStore().stages;

function getHardStages () {
    return Object.entries(stageStore)
        .filter(([code, stage]) => stage.category === 'Hard' && /^\d+-\d+H$/.test(code))
        .map(([code]) => {
            const [chapter, stageNum] = code.replace('H', '').split('-');
            return {
                code,
                chapter: parseInt(chapter, 10),
                stage: parseInt(stageNum, 10)
            };
        });
}

function getStagesWithPrefix(category: string, prefix: string) {
    return Object.entries(stageStore)
        .filter(([code, stage]) => stage.category === category && prefix === code.split('-')[0])
        .map(([code]) => {
            const stageNum = code.split('-')[1];
            return {
                code,
                chapter: -1,
                stage: parseInt(stageNum, 10)
            };
        })
        .sort((a, b) => b.stage - a.stage); // High to low
}

const hardStages = ref<IStage[]>(getHardStages());
const dustStages = ref<IStage[]>(getStagesWithPrefix('Resource', 'LP'));
const sharpodontyStages = ref<IStage[]>(getStagesWithPrefix('Resource', 'MA'));
const selectedStoryChapter = ref<number | 'any'>('any');
const selectedStoryStage = ref<string>('any');
const selectedDustStage = ref(plannerSettingsStore.settings.maxDustStage);
const selectedSharpodontyStage = ref(plannerSettingsStore.settings.maxSharpodontyStage);

onMounted(() => {
    // Initialize selections from store
    const maxStage = plannerSettingsStore.settings.maxStoryStage;
    if (maxStage && maxStage !== 'any') {
        const chapter = maxStage.replace('H', '').split('-')[0];
        selectedStoryChapter.value = parseInt(chapter, 10);
        selectedStoryStage.value = maxStage;
    } else {
        selectedStoryChapter.value = 'any';
        selectedStoryStage.value = 'any';
    }
});

const storyChapters = computed(() => {
    const uniqueChapters = [...new Set(hardStages.value.map(s => s.chapter))];
    uniqueChapters.sort((a, b) => b - a); // High to low
    return ['any', ...uniqueChapters];
});

const stagesInChapter = computed(() => {
    if (selectedStoryChapter.value === 'any') {
        return [];
    }
    const stages = hardStages.value.filter(s => s.chapter === selectedStoryChapter.value);
    stages.sort((a, b) => a.stage - b.stage);  // Low to high
    return stages.map(s => s.code);
});

function handleChapterChange () {
    if (selectedStoryChapter.value === 'any') {
        selectedStoryStage.value = 'any';
    } else {
        selectedStoryStage.value = stagesInChapter.value[0];
    }
}

const closeOverlay = () => {
    emit('closeOverlay');
};

const saveStagesSettings = () => {
    if (selectedStoryChapter.value === 'any') {
        plannerSettingsStore.settings.maxStoryStage = 'any';
    } else {
        plannerSettingsStore.settings.maxStoryStage = selectedStoryStage.value;
    }
    plannerSettingsStore.settings.maxDustStage = selectedDustStage.value;
    plannerSettingsStore.settings.maxSharpodontyStage = selectedSharpodontyStage.value;
    closeOverlay();
};

</script>

<template>
    <div class="custom-modal-small h-auto">
        <!-- Close button -->
        <button @click="closeOverlay" class="absolute top-2 right-4 text-white">
            <i class="fas fa-times"></i>
        </button>

        <p class="text-white text-center text-lg font-bold">{{ $t('stage-settings') }}</p>
        <p class="text-white text-center">{{ $t('select-the-highest-stage-the-planner-may-use') }}</p>

        <div class="flex justify-center items-center space-x-4 mt-4">
            <!-- Chapter Select -->
            <div class="flex flex-col items-center">
                <label for="chapter-select" class="text-white mb-1">Chapter</label>
                <select id="chapter-select" v-model="selectedStoryChapter" @change="handleChapterChange" class="p-2 rounded bg-gray-700 text-white">
                    <option v-for="chapter in storyChapters" :key="chapter" :value="chapter">
                        {{ chapter === 'any' ? $t('planner-no-max-stage-label') : `Chapter ${chapter}` }}
                    </option>
                </select>
            </div>

            <!-- Stage Select -->
            <div class="flex flex-col items-center">
                <label for="stage-select" class="text-white mb-1">Stage</label>
                <select id="stage-select" v-model="selectedStoryStage" :disabled="selectedStoryChapter === 'any'" class="p-2 rounded bg-gray-700 text-white min-w-[100px]">
                    <option v-if="selectedStoryChapter === 'any'" value="any">{{ $t('planner-no-max-stage-label') }}</option>
                    <option v-for="code in stagesInChapter" :key="code" :value="code">
                        {{ $t(code) }}
                    </option>
                </select>
            </div>
        </div>
        <div class="flex justify-center items-center space-x-4 mt-4">
            <!-- Dust Select -->
            <div class="flex flex-col items-center">
                <label for="dust-select" class="text-white mb-1">Dust</label>
                <select id="dust-select" v-model="selectedDustStage" class="p-2 rounded bg-gray-700 text-white min-w-[100px]">
                    <option value="any">{{ $t('planner-no-max-stage-label') }}</option>
                    <option v-for="stage in dustStages" :key="stage.code" :value="stage.code">
                        {{ $t(stage.code) }}
                    </option>
                </select>
            </div>

            <!-- Sharpodonty Select -->
            <div class="flex flex-col items-center">
                <label for="sharpodonty-select" class="text-white mb-1">Sharpodonty</label>
                <select id="sharpodonty-select" v-model="selectedSharpodontyStage" class="p-2 rounded bg-gray-700 text-white min-w-[100px]">
                    <option value="any">{{ $t('planner-no-max-stage-label') }}</option>
                    <option v-for="stage in sharpodontyStages" :key="stage.code" :value="stage.code">
                        {{ $t(stage.code) }}
                    </option>
                </select>
            </div>
        </div>

        <div class="flex justify-center pt-3">
            <button @click="saveStagesSettings" class="green-button">{{ $t('save') }}</button>
        </div>
    </div>
</template>

<style scoped></style>
