import { computed, onMounted, onUnmounted, readonly, ref } from 'vue';
import { useUserStore } from '@/stores/userStore';
import { setKornblumeData, getKornblumeData } from '@/utils';

// Extend the Window interface to include our custom callback function
declare global {
    interface Window {
        onGapiLoaded: () => void;
    }
}

// Helper to decode JWT
function decodeJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error('Error decoding JWT', e);
        return null;
    }
}

// === Reactive State ===
const gisScriptLoaded = ref(false);
const gapiScriptLoaded = ref(false);
const isLoading = ref(false);
const error = ref<Error | null>(null);
const subscriberCount = ref(0);

let tokenClient: google.accounts.oauth2.TokenClient | null = null;

// StoredToken augments the OAuth TokenResponse with an absolute expiry time
type StoredToken = Omit<google.accounts.oauth2.TokenResponse, 'error' | 'error_description' | 'error_uri'> & {
    expires_at: number; // ms since epoch
};

const accessToken = ref<StoredToken | null>(null);


// === Composable for Vue components ===
// Automatically loads scripts when the composable is instantiated.
export function useGoogleAPIs() {
    const userStore = useUserStore();
    const isSignedIn = computed(() => !!userStore.sub);
    const hasDriveConsent = computed(() => userStore.hasDriveConsent);

    onMounted(() => {
        subscriberCount.value++;
        if (subscriberCount.value > 0) {
            GApiSvc.init();
        }
    });
    onUnmounted(() => {
        subscriberCount.value--;
    });

    return {
        scriptLoaded: readonly(gapiScriptLoaded),
        scriptLoadError: readonly(error),
        isSignedIn, // Reflects AuthN status
        hasDriveConsent, // Reflects persistent AuthZ status
    };
}

// === Service Class for API interactions ===
export class GApiSvc {
    private static initializationPromise: Promise<void> | null = null;

    private static createScriptTag(url: string) {
        const scriptTag = document.createElement('script');
        scriptTag.src = url;
        scriptTag.async = true;
        scriptTag.defer = true;
        return scriptTag;
    }

    public static init(): Promise<void> {
        if (!this.initializationPromise) {
            this.initializationPromise = new Promise<void>((resolve, reject) => {
                // If scripts are already loaded, resolve immediately.
                if (gisScriptLoaded.value && gapiScriptLoaded.value) {
                    return resolve();
                }

                isLoading.value = true;

                const onScriptsLoaded = () => {
                    if (gisScriptLoaded.value && gapiScriptLoaded.value) {
                        isLoading.value = false;
                        // console.log('Both scripts loaded, resolving init promise.');
                        resolve();
                    }
                };

                // === Load the GIS script, which handles login ===
                const gisScript = this.createScriptTag('https://accounts.google.com/gsi/client');
                gisScript.onload = () => {
                    gisScriptLoaded.value = true;
                    this.initIdClient(); // For AuthN
                    this.initTokenClient(); // For AuthZ
                    onScriptsLoaded();
                };
                gisScript.onerror = () => {
                    error.value = new Error('Failed to load Google Identity Services script.');
                    isLoading.value = false;
                    reject(error.value);
                };
                document.head.appendChild(gisScript);

                // === Load the Google API script, which handles all other Google APIs ===
                const gapiScript = this.createScriptTag('https://apis.google.com/js/api.js?onload=onGapiLoaded');
                window.onGapiLoaded = () => {
                    gapiScriptLoaded.value = true;
                    this.initApiClient();
                    onScriptsLoaded();
                };
                gapiScript.onerror = () => {
                    error.value = new Error('Failed to load Google API script.');
                    isLoading.value = false;
                    reject(error.value);
                };
                document.head.appendChild(gapiScript);
            });
        }
        return this.initializationPromise;
    }

    private static initIdClient() { // For AuthN
        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
            console.error('Google Client ID not configured.');
            return;
        }
        google.accounts.id.initialize({ // This should only be called once per page load.
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            use_fedcm_for_prompt: true,
            use_fedcm_for_button: true,
            auto_select: true,
            cancel_on_tap_outside: true,
            // login_hint: '', // TODO use this if user is already logged in
            callback: (response) => {
                const userStore = useUserStore();
                if (response.credential) {
                    console.log('Login request successful.');
                    const userData = decodeJwt(response.credential);
                    userStore.setUser(userData);
                    GApiSvc.requestDriveAccess(); // Chain into AuthZ on login. Might not work on auto-login
                } else {
                    console.log('Login request failed.');
                    userStore.clearUser();
                }
            }
        });
    }

    private static initTokenClient() { // For AuthZ
        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
            console.error('Google Client ID not configured.');
            return;
        }
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            // Request permission only for files created or opened by the app.
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response: google.accounts.oauth2.TokenResponse) => {
                const userStore = useUserStore();
                if (response.error) {
                    // Don't treat silent sign-in failures as a critical error.
                    // These are expected if the user is not logged in or has not granted consent.
                    const isExpectedError = ['user_cancel', 'popup_closed', 'invalid_grant', 'access_denied'].includes(response.error);
                    if (!isExpectedError) {
                        error.value = new Error(response.error_description || response.error);
                    }
                    accessToken.value = null;
                } else {
                    error.value = null; // Clear any previous errors on success.
                    // Calculate absolute expiry time from expires_in (seconds).
                    const bufferDuration = 2 * 60 * 1000; // 2 minutes
                    const expiresIn = Number(response.expires_in) || 0;
                    const expiresAt = expiresIn ?
                        Date.now() + expiresIn * 1000 - bufferDuration :
                        0;
                    // Build stored token by copying returned fields and adding expires_at.
                    const stored = Object.assign({}, response, { expires_at: expiresAt }) as StoredToken;
                    accessToken.value = stored;
                    try {
                        gapi.client.setToken(response as google.accounts.oauth2.TokenResponse);
                    } catch (e) {
                        // Don't break if gapi isn't available yet; surface the error.
                        console.warn('gapi.client.setToken failed', e);
                    }
                    userStore.setHasDriveConsent(true);
                }
            },
        });
    }

    private static initApiClient() { // For Drive access
        // Creates gapi.client.drive from the discovery docs
        // The discovery doc doesn't require an API to access, but using a key is still recommended.
         gapi.load('client', () => {
            gapi.client.init({
                apiKey: import.meta.env.VITE_GOOGLE_API_KEY,
                discoveryDocs: [
                    'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
                ],
            }).catch(e => {
                error.value = e;
            });
        });
    }

    static signIn() {
        // All configuration was done earlier in initApiClient
        google.accounts.id.prompt();
    }

    static signOut() {
        const userStore = useUserStore();
        google.accounts.id.disableAutoSelect();
        userStore.clearUser();
        if (accessToken.value) {
            google.accounts.oauth2.revoke(accessToken.value.access_token, () => {
                accessToken.value = null;
                gapi.client.setToken(null);
            });
        }
    }

    static isSignedIn() {
        const userStore = useUserStore();
        return !!userStore.sub;
    }

    static getEmail() {
        const userStore = useUserStore();
        return userStore.email;
    }

    static requestDriveAccess() {
        const userStore = useUserStore();
        if (!this.isSignedIn()) {
            console.error('User is not signed in. Cannot request Drive access.');
            return;
        }
        tokenClient?.requestAccessToken({ prompt: '', hint: userStore.sub || '' });
    }

    static hasDriveConsent() {
        const userStore = useUserStore();
        return !!userStore.hasDriveConsent;
    }

    static async getFiles() {
        try {
            const response = await gapi.client.drive.files.list({
                // LATER store the data in the appDataFolder if permission was given.
                // We would need to decide how to migrate any existing data and what to do if the user changes their permission grants. The new API shouldn't allow partial auth, which is helpful.
                // spaces: 'appDataFolder',
                pageSize: 10,
                fields: 'nextPageToken, files(id, name)'
            });
            return response.result.files;
        } catch (err) {
            error.value = err as Error;
            return null;
        }
    }

    static async createFile(filename: string, content: string) {
        const boundary = '-------314159265358979323846';
        const delimiter = '\r\n--' + boundary + '\r\n';
        const close_delim = '\r\n--' + boundary + '--';

        const contentType = 'application/json';
        const metadata = {
            name: filename,
            // parents: ['appDataFolder'], // LATER
            mimeType: contentType
        };

        const multipartRequestBody =
            delimiter +
            'Content-Type: application/json\r\n\r\n' +
            JSON.stringify(metadata) +
            delimiter +
            'Content-Type: ' + contentType + '\r\n\r\n' +
            content +
            close_delim;

        const request = gapi.client.request({
            path: '/upload/drive/v3/files',
            method: 'POST',
            params: { uploadType: 'multipart' },
            headers: {
                'Content-Type': `multipart/related; boundary="${boundary}"`
            },
            body: multipartRequestBody
        });

        return request;
    }

    static async downloadFile(fileId: string) {
        try {
            const response = await gapi.client.drive.files.get({
                fileId,
                alt: 'media'
            });
            return JSON.parse(response.body);
        } catch (err) {
            error.value = err as Error;
            return null;
        }
    }

    static async updateFile(fileId: string, newContent: string) {
        const request = gapi.client.request({
            path: `/upload/drive/v3/files/${fileId}`,
            method: 'PATCH',
            params: { uploadType: 'media' },
            headers: {
                'Content-Type': 'application/json'
            },
            body: newContent
        });
        return request;
    }
}

export async function syncDrive() {
    if (GApiSvc.hasDriveConsent()) {
        const files = await GApiSvc.getFiles();
        if (!files) {
            console.warn('No files returned by Drive');
            return;
        }

        const file = files.find((f: gapi.client.drive.File) => f.name === 'kornblume.json');
        if (!file) {
            console.log('Creating initial kornblume.json in Drive from localStorage data')
            GApiSvc.createFile('kornblume.json', JSON.stringify(getKornblumeData()));
        } else if (file.id) {
            // If 'kornblume.json' does exist, download it
            const driveData = await GApiSvc.downloadFile(file.id);
            if (!driveData) {
                console.warn('Error downloading file from Drive');
                return;
            }

            const localDataLastModified = new Date(localStorage.getItem('lastModified') ?? '0');
            const driveDataLastModified = new Date(driveData.lastModified);

            if (localDataLastModified < driveDataLastModified) {
                console.log('Drive is newer. Updating local data');
                setKornblumeData(driveData);
                localStorage.setItem('lastModified', driveData.lastModified);
                // setTimeout(() => window.location.reload(), 500);
            } else if ((localDataLastModified > driveDataLastModified) || !driveData.lastModified) {
                console.log('Local is newer. Updating drive data');
                GApiSvc.updateFile(file.id, JSON.stringify(getKornblumeData()));
            } else {
                console.log('Local and Drive data have the same date. No sync needed.');
            }
        } else {
            console.warn('Drive file found but not processed', file)
        }
    }
}

// This sync won't overwrite the existing remote data.
export async function syncDriveOnLogin() {
    if (GApiSvc.hasDriveConsent()) {
        const files = await GApiSvc.getFiles();
        if (!files) return;

        const file = files.find((f: gapi.client.drive.File) => f.name === 'kornblume.json');

        if (!file) {
            await GApiSvc.createFile('kornblume.json', JSON.stringify(localStorage));
            console.log('kornblume.json created');
        } else if (file.id) {
            console.log('kornblume.json exists. importing data...');
            const fileData = await GApiSvc.downloadFile(file.id);
            if (fileData) {
                setKornblumeData(fileData);
                // setTimeout(() => window.location.reload(), 500);
            }
        }
    }
}
