<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-title>Profile</ion-title>
        <ion-buttons slot="end">
          <ion-button v-if="!isEditing" @click="startEdit">
            <Icon icon="lucide:pencil" class="header-icon" />
          </ion-button>
          <ion-button v-else @click="cancelEdit">
            <Icon icon="lucide:x" class="header-icon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- Loading -->
      <div v-if="isLoading && !profile" class="profile-loading">
        <div class="profile-loading__spinner" />
        <p>Loading profile…</p>
      </div>

      <template v-else-if="profile">
        <!-- Avatar + name header -->
        <div class="profile-hero">
          <div class="profile-avatar">
            <img
              v-if="profile.photo?.url"
              :src="profile.photo.url"
              :alt="profile.name"
              class="profile-avatar__img"
            />
            <span v-else class="profile-avatar__initials">{{ initials }}</span>
          </div>
          <p class="profile-hero__name">{{ profile.name }}</p>
          <AppBadge :text="roleLabel" variant="info" size="sm" />
        </div>

        <!-- View mode -->
        <template v-if="!isEditing">
          <div class="profile-section">
            <p class="profile-section__title">Personal Info</p>
            <div class="profile-card">
              <div class="profile-field">
                <Icon icon="lucide:phone" class="profile-field__icon" aria-hidden="true" />
                <div>
                  <p class="profile-field__label">Phone</p>
                  <p class="profile-field__value">{{ profile.phone }}</p>
                </div>
              </div>
              <div v-if="profile.email" class="profile-field">
                <Icon icon="lucide:mail" class="profile-field__icon" aria-hidden="true" />
                <div>
                  <p class="profile-field__label">Email</p>
                  <p class="profile-field__value">{{ profile.email }}</p>
                </div>
              </div>
              <div class="profile-field">
                <Icon icon="lucide:user-check" class="profile-field__icon" aria-hidden="true" />
                <div>
                  <p class="profile-field__label">Role</p>
                  <p class="profile-field__value">{{ roleLabel }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Quick links -->
          <div class="profile-section">
            <p class="profile-section__title">Account</p>
            <div class="profile-card profile-card--links">
              <button class="profile-link" @click="goTo('/sessions')">
                <Icon icon="lucide:monitor-smartphone" class="profile-link__icon" aria-hidden="true" />
                <span class="profile-link__label">Active Sessions</span>
                <Icon icon="lucide:chevron-right" class="profile-link__chevron" aria-hidden="true" />
              </button>
              <button class="profile-link" @click="goTo('/support')">
                <Icon icon="lucide:life-buoy" class="profile-link__icon" aria-hidden="true" />
                <span class="profile-link__label">Support & Feedback</span>
                <Icon icon="lucide:chevron-right" class="profile-link__chevron" aria-hidden="true" />
              </button>
            </div>
          </div>
        </template>

        <!-- Edit mode -->
        <template v-else>
          <div class="edit-form">
            <div class="form-field">
              <label class="form-label">Name</label>
              <input v-model="editForm.name" type="text" class="form-input" placeholder="Your name" />
            </div>
            <div class="form-field">
              <label class="form-label">Email</label>
              <input v-model="editForm.email" type="email" class="form-input" placeholder="your@email.com" />
            </div>

            <p v-if="saveError" class="form-error">{{ saveError }}</p>

            <ion-button
              expand="block"
              :disabled="isSaving"
              class="save-btn"
              @click="handleSave"
            >
              <ion-spinner v-if="isSaving" name="crescent" slot="start" />
              Save Changes
            </ion-button>
          </div>
        </template>
      </template>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonRefresher, IonRefresherContent, IonSpinner,
  onIonViewWillEnter,
} from '@ionic/vue'
import { Icon } from '@iconify/vue'
import { storeToRefs } from 'pinia'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'
import { getProfile, updateProfile } from '@/shared/api'
import { useToast } from '@/shared/composables'
import AppBadge from '@/shared/components/ui/AppBadge.vue'
import type { UserProfile } from '@/shared/models'

const router = useRouter()
const authStore = useAuthStore()
const userTypeStore = useUserTypeStore()
const { isBeautician } = storeToRefs(userTypeStore)
const { showSuccess, showError } = useToast()

const profile = ref<UserProfile | null>(null)
const isLoading = ref(false)
const isEditing = ref(false)
const isSaving = ref(false)
const saveError = ref<string | null>(null)

const editForm = ref({ name: '', email: '' })

const initials = computed(() => {
  const name = profile.value?.name ?? ''
  return name.split(' ').slice(0, 2).map((n) => n[0]?.toUpperCase() ?? '').join('')
})

const roleLabel = computed(() => isBeautician.value ? 'Beautician' : 'Rider')

async function fetchProfile(): Promise<void> {
  isLoading.value = true
  try {
    profile.value = await getProfile()
    await authStore.setUserProfile(profile.value)
  } catch (err) {
    showError(err instanceof Error ? err.message : 'Failed to load profile')
  } finally {
    isLoading.value = false
  }
}

function startEdit(): void {
  editForm.value = {
    name: profile.value?.name ?? '',
    email: profile.value?.email ?? '',
  }
  isEditing.value = true
  saveError.value = null
}

function cancelEdit(): void {
  isEditing.value = false
  saveError.value = null
}

async function handleSave(): Promise<void> {
  isSaving.value = true
  saveError.value = null
  try {
    const updated = await updateProfile({
      name: editForm.value.name,
      email: editForm.value.email || undefined,
    })
    profile.value = updated
    await authStore.setUserProfile(updated)
    isEditing.value = false
    showSuccess('Profile updated')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save'
    showError(saveError.value)
  } finally {
    isSaving.value = false
  }
}

async function handleRefresh(event: CustomEvent): Promise<void> {
  await fetchProfile()
  ;(event.target as HTMLIonRefresherElement).complete()
}

function goTo(path: string): void {
  router.push(path)
}

onMounted(fetchProfile)
onIonViewWillEnter(() => {
  if (!profile.value) fetchProfile()
})
</script>

<style scoped>
.header-icon { font-size: 20px; }

/* Loading */
.profile-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 80px 32px;
  color: var(--color-text-muted);
}

.profile-loading__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-brand);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

/* Hero */
.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px 20px;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
}

.profile-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: 3px solid rgba(255, 255, 255, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 4px;
}

.profile-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar__initials {
  font-size: 28px;
  font-weight: 700;
  color: #fff;
}

.profile-hero__name {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: #fff;
}

/* Sections */
.profile-section {
  padding: 16px 16px 0;
}

.profile-section__title {
  margin: 0 0 8px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.profile-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.profile-field {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.profile-field:last-child { border-bottom: none; }

.profile-field__icon {
  font-size: 18px;
  color: var(--color-brand);
  flex-shrink: 0;
  margin-top: 2px;
}

.profile-field__label {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.profile-field__value {
  margin: 2px 0 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

/* Links */
.profile-card--links { display: flex; flex-direction: column; }

.profile-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.profile-link:last-child { border-bottom: none; }
.profile-link:active { background: var(--color-background); }

.profile-link__icon {
  font-size: 18px;
  color: var(--color-brand);
  flex-shrink: 0;
}

.profile-link__label {
  flex: 1;
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text);
}

.profile-link__chevron {
  font-size: 16px;
  color: var(--color-text-muted);
}

/* Edit form */
.edit-form {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-field { display: flex; flex-direction: column; gap: 6px; }

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-surface);
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
}

.form-input:focus { border-color: var(--color-brand); }

.form-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  text-align: center;
}

.save-btn { --border-radius: var(--radius-xl); }

@keyframes spin { to { transform: rotate(360deg); } }
</style>
