import { onMounted, onUnmounted, readonly, ref, watch } from 'vue';
import { setKornblumeData } from '@/utils';
import { gapi } from 'gapi-script'; // This is for the GDrive API client, not auth

// Extend the Window interface to include our custom callback functions
declare global {
    interface Window {
        onGisLoaded: () => void;
        onGapiLoaded: () => void;
    }
}

// === Reactive State ===
const gisScriptLoaded = ref(false);
const gapiScriptLoaded = ref(false);
const isLoading = ref(false);
const error = ref<Error | null>(null);
const subscriberCount = ref(0);

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
const accessToken = ref<Omit<google.accounts.oauth2.TokenResponse, 'error' | 'error_description' | 'error_uri'> | null>(null);

// Watch for components using the composable and load scripts when needed
watch(
    () => subscriberCount.value,
    (newCount) => {
        if (newCount > 0) {
            GApiSvc.init();
        }
    }
);

// === Composable for Vue components ===
export function useGapi() {
    onMounted(() => {
        subscriberCount.value++;
    });
    onUnmounted(() => {
        subscriberCount.value--;
    });
    return {
        scriptLoaded: readonly(gapiScriptLoaded),
        scriptLoadError: readonly(error),
        isSignedIn: readonly(accessToken)
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
                    console.log('onScriptsLoaded check. GIS:', gisScriptLoaded.value, 'GAPI:', gapiScriptLoaded.value);
                    if (gisScriptLoaded.value && gapiScriptLoaded.value) {
                        isLoading.value = false;
                        console.log('Both scripts loaded, resolving init promise.');
                        resolve();
                    }
                };

                // window.onGisLoaded is not being called, so we switch to script.onload

                window.onGapiLoaded = () => {
                    console.log('GAPI script loaded.');
                    gapiScriptLoaded.value = true;
                    this.initApiClient();
                    onScriptsLoaded();
                };

                const gisScript = this.createScriptTag('https://accounts.google.com/gsi/client');
                gisScript.onload = () => {
                    console.log('GIS script .onload fired.');
                    gisScriptLoaded.value = true;
                    this.initTokenClient();
                    onScriptsLoaded();
                };
                gisScript.onerror = () => {
                    error.value = new Error('Failed to load Google Identity Services script.');
                    isLoading.value = false;
                    reject(error.value);
                };
                document.head.appendChild(gisScript);

                const gapiScript = this.createScriptTag('https://apis.google.com/js/api.js?onload=onGapiLoaded');
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

    private static initTokenClient() {
        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID) {
            console.error('Google Client ID not configured.');
            return;
        }
        tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            // Request permission only for files created or opened by the app.
            scope: 'https://www.googleapis.com/auth/drive.file',
            callback: (response) => {
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
                    accessToken.value = response;
                    gapi.client.setToken(response);
                }
            },
        });

        // Attempt a silent token request on load.
        tokenClient.requestAccessToken({ prompt: 'none' });
    }

    private static initApiClient() {
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
        if (tokenClient) {
            console.log('Requesting access token...');
            // Prompt the user to select an account and grant access
            tokenClient.requestAccessToken();
        } else {
            console.error('GApiSvc.signIn() called but tokenClient is not initialized.');
            error.value = new Error('Google API not initialized.');
        }
    }

    static signOut() {
        if (accessToken.value) {
            google.accounts.oauth2.revoke(accessToken.value.access_token, () => {
                accessToken.value = null;
                gapi.client.setToken(null);
            });
        }
    }

    static isSignedIn() {
        return !!accessToken.value;
    }

    static getEmail() {
        // Note: GIS doesn't provide a direct profile API like the old GSI.
        // To get user info, you'd typically decode the ID token (if using `id.initialize`)
        // or call the People API. For now, this is out of scope of the direct migration.
        return '';
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
    if (GApiSvc.isSignedIn()) {
        const files = await GApiSvc.getFiles();
        if (!files) return; // Early exit if there was an error getting files

        const file = files.find((f: { name: string; }) => f.name === 'kornblume.json');
        if (!file) {
            // If 'kornblume.json' doesn't exist, create it with the data from localStorage
            GApiSvc.createFile('kornblume.json', JSON.stringify(localStorage));
        } else if (file.id) {
            // If 'kornblume.json' does exist, download it
            const driveData = await GApiSvc.downloadFile(file.id);
            if (!driveData) return; // Early exit on download error

            const localDataLastModified = new Date(localStorage.getItem('lastModified') ?? '0');
            const driveDataLastModified = new Date(driveData.lastModified);

            if (localDataLastModified < driveDataLastModified) {
                console.log('Drive is newer. Updating local data');
                setKornblumeData(driveData);
                localStorage.setItem('lastModified', driveData.lastModified);
                setTimeout(() => window.location.reload(), 500);
            } else if (localDataLastModified > driveDataLastModified) {
                console.log('Local is newer. Updating drive data');
                GApiSvc.updateFile(file.id, JSON.stringify(localStorage));
            }
        }
    }
}
