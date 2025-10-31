<script setup lang="ts" name="ProfileView">
import { ref, watch } from 'vue';
import { exportKornblumeData, importKornblumeData, resetKornblumeData } from '@/utils';
import { usePullsRecordStore } from '@/stores/pullsRecordStore';
import { GApiSvc, useGoogleAPIs, syncDrive, syncDriveOnLogin } from '@/composables/gApi';

const fileInput = ref<HTMLElement | null>(null);
const showEmail = ref(false);
const isGapiInitialized = ref(false); // This will be true only when the GApiSvc is fully ready.

// Use the composable to get reactive, shared state, but manage readiness locally.
const { isSignedIn, hasDriveConsent } = useGoogleAPIs();

// This effect runs when the component mounts and whenever its dependencies change.
// We wait for the API to be ready, then check the sign-in status and sync.
if (GApiSvc.isConfigured()) {
    GApiSvc.init().then(() => {
        isGapiInitialized.value = true;
        // We can sync drive here if the user is already signed in from a previous session.
        if (isSignedIn.value) {
            syncDrive();
        }
    }).catch(err => {
        console.error('GApiSvc init failed:', err);
    });
}

const exportStores = () => {
    exportKornblumeData();
};

const triggerFileInput = () => {
    fileInput.value?.click();
};

const importStores = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
        importKornblumeData(file);
    }
};

const resetStores = () => {
    resetKornblumeData();
};

const resetTracker = () => {
    usePullsRecordStore().reset();
    // window.location.reload();
};

const loginGoogleDrive = () => {
    // Just trigger the sign-in flow. The reactive `isSignedIn` ref
    // from useGoogleAPIs() will update automatically on success.
    GApiSvc.signIn(true);
};

// Only run syncDriveOnLogin when the user transitions from signed-out -> signed-in.
watch(
    () => isSignedIn.value,
    (newVal, oldVal) => {
        if (!oldVal && newVal) {
            // actual login event
            syncDriveOnLogin();
        }
    }
);

const signOutGoogleDrive = () => {
    GApiSvc.signOut();
    // No need to set isSignedIn.value = false, it's handled reactively.
};

</script>

<template>
    <div class="container">
        <div class="pb-6">
            <h2 class="text-2xl text-white font-bold mb-2 lg:mb-4">{{ $t('profile') }}</h2>
            <p class="text-white"> {{ $t('you-can-export-or-import-your-data-here') }}</p>
            <div class="flex justify-center items-center p-2 space-x-5">
                <button @click="exportStores" class="blue-button">
                    {{ $t('export-data') }} </button>

                <input type="file" ref="fileInput" @change="importStores" accept=".json" class="ml-4"
                    style="display: none;" />
                <button @click="triggerFileInput" class="green-button">
                    {{ $t('import-data') }} </button>
            </div>
        </div>

        <div v-if="GApiSvc.isConfigured()" class="pb-6">
            <h2 class="text-2xl text-white font-bold mb-2 lg:mb-4"> {{ $t('google-drive-save') }} </h2>
            <p class="text-white"> {{
                $t('you-can-use-google-drive-and-let-kornblume-save-and-sync-data-between-devices-we-only-read-and-write-files-that-kornblume-created')
            }}</p>

            <!-- Notification -->
            <!-- <div role="alert" class="alert alert-info custom-gradient-gray-blue text-white mt-4">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    class="stroke-current shrink-0 w-6 h-6">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p class="text-sm lg:text-base"> Experimental. It is heavily advised to Export Backup first and use a dummy Gmail.</p>
            </div> -->

            <div class="flex justify-center items-center p-2 space-x-5">
                <button :disabled="!isGapiInitialized" v-if="!isSignedIn" class="green-button" @click="loginGoogleDrive">{{
                $t('login-google-drive') }} <i class="fa-brands fa-google-drive"></i> </button>
                <div class="flex flex-col justify-center items-center" v-else>
                    <div class="flex items-center space-x-2">
                        <button :disabled="!isGapiInitialized" class="blue-button" @click="signOutGoogleDrive">{{
                            $t('sign-out-google-drive') }} <i class="fa-brands fa-google-drive"></i>
                        </button>
                        <button v-if="!hasDriveConsent" :disabled="!isGapiInitialized" class="green-button" @click="GApiSvc.requestDriveAccess()">
                            {{ $t('grant-drive-access') }} <i class="fa-brands fa-google-drive"></i>
                        </button>
                    </div>
                    <div v-if="showEmail" class="text-white opacity-90 mt-2">
                        <p>{{ GApiSvc.getEmail() }}</p>
                    </div>
                    <button v-else @click="showEmail = true" class="btn btn-ghost btn-sm mt-2 text-white/90 opacity-90">
                        {{ $t('click-to-show-email') }} </button>
                    <div class="flex space-x-1 items-center">
                        <p :class="hasDriveConsent ? 'text-success' : 'text-yellow-400'" class="text-base">•</p>
                        <p class="text-white text-sm opacity-90">{{ hasDriveConsent ? $t('synced') : $t('not-synced-drive-access-required') }}</p>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="pb-10">
            <h2 class="text-2xl text-white font-bold mb-2 lg:mb-4"> {{ $t('google-drive-save') }} </h2>
            <p class="text-white"> {{
                $t('google-drive-not-configured')
            }}</p>
        </div>

        <div class="pb-6">
            <h2 class="text-2xl text-white font-bold mb-2 lg:mb-4">{{ $t('danger-zone') }}</h2>
            <p class="text-white">{{
                $t('if-you-encounter-any-unexpected-issues-with-the-site-you-can-reset-your-data-sorry-for-the-inconvenience')
            }}</p>
            <div class="flex flex-wrap justify-center items-center p-2 space-x-5 gap-y-5">
                <button onclick="resetTracker.showModal()" class="red-button">
                    {{ $t('reset-tracker') }} </button>
                <button onclick="resetAll.showModal()" class="red-button">
                    {{ $t('reset-data') }} </button>
            </div>

            <dialog id="resetTracker" class="modal">
                <div
                    class="modal-box custom-border custom-gradient-gray-blue flex flex-col justify-center items-center">
                    <form method="dialog">
                        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-white">✕</button>
                    </form>
                    <p class="pb-4 text-white text-center">{{
                $t('once-you-delete-your-summon-tracker-data-there-is-no-going-back') }}</p>
                    <p class="pb-4 text-white text-center">{{ $t('please-be-certain') }}</p>
                    <button @click="resetTracker" class="red-button">
                        {{ $t('reset-tracker') }} </button>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button>close</button>
                </form>
            </dialog>

            <dialog id="resetAll" class="modal">
                <div
                    class="modal-box custom-border custom-gradient-gray-blue flex flex-col justify-center items-center">
                    <form method="dialog">
                        <button class="btn btn-sm btn-circle btn-ghost absolute right-2 top-2 text-white">✕</button>
                    </form>
                    <p class="pb-4 text-white text-center">{{ $t('once-you-delete-your-data-there-is-no-going-back') }}
                    </p>
                    <p class="pb-4 text-white text-center">{{ $t('please-be-certain') }}</p>
                    <button @click="resetStores" class="red-button">
                        {{ $t('reset-all') }} </button>
                </div>
                <form method="dialog" class="modal-backdrop">
                    <button> close </button>
                </form>
            </dialog>
        </div>
    </div>
</template>

<style scoped></style>
