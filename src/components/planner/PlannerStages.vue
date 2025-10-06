<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { usePlannerSettingsStore } from '../../stores/plannerSettingsStore';
import stagesData from '../../../public/data/stages.json';


interface IStage {
    code: string;
    name: string;
    chapter: number;
    stage: number;
}

const emit = defineEmits(['closeOverlay']);


const plannerSettingsStore = usePlannerSettingsStore();

function getHardStages () {
    return Object.entries(stagesData)
        .filter(([code, stage]) => stage.category === 'Hard' && /^\d+-\d+H$/.test(code))
        .map(([code, stage]) => {
            const [chapter, stageNum] = code.replace('H', '').split('-');
            return {
                code,
                name: stage.name,
                chapter: parseInt(chapter, 10),
                stage: parseInt(stageNum, 10)
            };
        });
}

const hardStages = ref<IStage[]>(getHardStages());
const selectedStoryChapter = ref<number | 'any'>('any');
const selectedStoryStage = ref<string>('any');

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

const chapters = computed(() => {
    const uniqueChapters = [...new Set(hardStages.value.map(s => s.chapter))];
    uniqueChapters.sort((a, b) => a - b);
    return ['any', ...uniqueChapters];
});

const stagesInChapter = computed(() => {
    if (selectedStoryChapter.value === 'any') {
        return [];
    }
    const stages = hardStages.value.filter(s => s.chapter === selectedStoryChapter.value);
    stages.sort((a, b) => a.stage - b.stage);
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
                    <option v-for="chapter in chapters" :key="chapter" :value="chapter">
                        {{ chapter === 'any' ? $t('planner-no-max-stage-label') : `Chapter ${chapter}` }}
                    </option>
                </select>
            </div>

            <!-- Stage Select -->
            <div class="flex flex-col items-center">
                <label for="stage-select" class="text-white mb-1">Stage</label>
                <select id="stage-select" v-model="selectedStoryStage" :disabled="selectedStoryChapter === 'any'" class="p-2 rounded bg-gray-700 text-white min-w-[100px]">
                    <option v-if="selectedStoryChapter === 'any'" value="any">{{ $t('planner-no-max-stage-label') }}</option>
                    <option v-for="stage in stagesInChapter" :key="stage" :value="stage">
                        {{ stage }}
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
