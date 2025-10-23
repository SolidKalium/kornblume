import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore(
  'user',
  () => {
    const email = ref<string | null>(null)
    const sub = ref<string | null>(null)
    const name = ref<string | null>(null)
    const picture = ref<string | null>(null)
    const hasDriveConsent = ref<boolean>(false)

    function setUser(userData: { email: string; sub: string; name: string; picture: string }) {
      email.value = userData.email
      sub.value = userData.sub
      name.value = userData.name
      picture.value = userData.picture
    }

    function setHasDriveConsent(value: boolean) {
      hasDriveConsent.value = value
    }

    function clearUser() {
      email.value = null
      sub.value = null
      name.value = null
      picture.value = null
      hasDriveConsent.value = false
    }

    return {
      email,
      sub,
      name,
      picture,
      hasDriveConsent,
      setUser,
      setHasDriveConsent,
      clearUser
    }
  },
  {
    persist: true
  }
)
