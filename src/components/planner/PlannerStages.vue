<script setup lang="ts">

defineProps({
    settings: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['closeOverlay', 'saveStagesSettings']);

const closeOverlay = () => {
    emit('closeOverlay');
};

const saveStagesSettings = () => {
    // Will be implemented later
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
        <p class="text-white text-center">{{ $t('select-the-highest-stages-the-planner-may-use') }}</p>
        <!-- Add settings here -->

        <div class="flex justify-center pt-3">
            <button @click="saveStagesSettings" class="green-button">{{ $t('save') }}</button>
        </div>
    </div>
</template>

<style scoped></style>
