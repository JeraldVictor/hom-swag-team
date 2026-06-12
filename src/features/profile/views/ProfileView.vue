<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button class="header-icon-btn" aria-label="Open menu" @click="openMenu">
            <Icon icon="lucide:menu" class="header-icon" />
          </ion-button>
        </ion-buttons>
        <ion-title>Profile</ion-title>
        <ion-buttons slot="end">
          <ion-button aria-label="Edit profile" @click="openEdit">
            <Icon icon="lucide:pencil" class="header-icon" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <!-- ── Hero ──────────────────────────────────────────────────────── -->
      <div class="profile-hero anim-hero">
        <div class="profile-avatar" @click="openEdit">
          <img
            v-if="profilePhotoUrl"
            :src="profilePhotoUrl"
            :alt="profile.name"
            class="profile-avatar__img"
          />
          <span v-else class="profile-avatar__initials">{{ initials }}</span>
          <div class="profile-avatar__edit-badge" aria-hidden="true">
            <Icon icon="lucide:camera" />
          </div>
        </div>
        <p class="profile-hero__name">{{ profile.name }}</p>
        <span class="profile-hero__role-badge">{{ roleLabel }}</span>
        <p v-if="profile.email" class="profile-hero__email">{{ profile.email }}</p>
      </div>

      <!-- ── Personal Info ──────────────────────────────────────────────── -->
      <div class="section">
        <p class="section-title">Personal Info</p>
        <div class="info-card">
          <div class="info-row">
            <span class="info-row__icon-wrap info-row__icon-wrap--brand">
              <Icon icon="lucide:phone" aria-hidden="true" />
            </span>
            <div class="info-row__body">
              <p class="info-row__label">Phone</p>
              <p class="info-row__value">{{ profile.phone }}</p>
            </div>
          </div>
          <div v-if="profile.email" class="info-row">
            <span class="info-row__icon-wrap info-row__icon-wrap--brand">
              <Icon icon="lucide:mail" aria-hidden="true" />
            </span>
            <div class="info-row__body">
              <p class="info-row__label">Email</p>
              <p class="info-row__value">{{ profile.email }}</p>
            </div>
          </div>
          <div v-if="profile.date_of_birth" class="info-row">
            <span class="info-row__icon-wrap info-row__icon-wrap--brand">
              <Icon icon="lucide:cake" aria-hidden="true" />
            </span>
            <div class="info-row__body">
              <p class="info-row__label">Date of Birth</p>
              <p class="info-row__value">{{ formatDate(profile.date_of_birth) }}</p>
            </div>
          </div>
          <div v-if="profile.address" class="info-row">
            <span class="info-row__icon-wrap info-row__icon-wrap--brand">
              <Icon icon="lucide:map-pin" aria-hidden="true" />
            </span>
            <div class="info-row__body">
              <p class="info-row__label">Address</p>
              <p class="info-row__value">{{ profile.address }}</p>
            </div>
          </div>
          <div v-if="profile.emergency_contact_name" class="info-row">
            <span class="info-row__icon-wrap info-row__icon-wrap--warning">
              <Icon icon="lucide:heart-pulse" aria-hidden="true" />
            </span>
            <div class="info-row__body">
              <p class="info-row__label">Emergency Contact</p>
              <p class="info-row__value">{{ profile.emergency_contact_name }}</p>
              <p v-if="profile.emergency_contact_phone" class="info-row__sub">
                {{ profile.emergency_contact_phone }}
              </p>
            </div>
          </div>
          <!-- Edit nudge if fields are empty -->
          <button v-if="!profile.email && !profile.address" class="info-row info-row--nudge" @click="openEdit">
            <Icon icon="lucide:plus-circle" class="info-row__nudge-icon" aria-hidden="true" />
            <span class="info-row__nudge-text">Add email, address & more</span>
            <Icon icon="lucide:chevron-right" class="info-row__nudge-chevron" aria-hidden="true" />
          </button>
        </div>
      </div>

      <!-- ── Documents ──────────────────────────────────────────────────── -->
      <div class="section">
        <div class="section-header">
          <p class="section-title">Documents & KYC</p>
          <button class="section-edit-btn" @click="openEdit">
            <Icon icon="lucide:pencil" aria-hidden="true" />
            Manage
          </button>
        </div>
        <div class="docs-grid anim-grid">
          <div
            v-for="doc in documentSlots"
            :key="doc.type"
            class="doc-card"
            :class="{ 'doc-card--uploaded': !!doc.uploaded }"
            @click="openEdit"
          >
            <div class="doc-card__icon-wrap" :class="doc.uploaded ? 'doc-card__icon-wrap--done' : 'doc-card__icon-wrap--empty'">
              <Icon :icon="doc.icon" aria-hidden="true" />
            </div>
            <p class="doc-card__label">{{ doc.label }}</p>
            <div class="doc-card__status">
              <template v-if="doc.uploaded">
                <Icon icon="lucide:check-circle-2" class="doc-card__status-icon doc-card__status-icon--done" />
                <span class="doc-card__status-text doc-card__status-text--done">
                  {{ doc.verified ? 'Verified' : 'Uploaded' }}
                </span>
              </template>
              <template v-else>
                <Icon icon="lucide:upload" class="doc-card__status-icon doc-card__status-icon--empty" />
                <span class="doc-card__status-text doc-card__status-text--empty">Upload</span>
              </template>
            </div>
          </div>
        </div>
      </div>

      <!-- ── Account links ──────────────────────────────────────────────── -->
      <div class="section">
        <p class="section-title">Account</p>
        <div class="links-card">
          <button class="link-row" @click="goTo('/support')">
            <span class="link-row__icon-wrap">
              <Icon icon="lucide:life-buoy" aria-hidden="true" />
            </span>
            <span class="link-row__label">Support & Feedback</span>
            <Icon icon="lucide:chevron-right" class="link-row__chevron" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="bottom-spacer" />
    </ion-content>

    <!-- ══════════════════════════════════════════════════════════════════ -->
    <!-- Edit sheet                                                         -->
    <!-- ══════════════════════════════════════════════════════════════════ -->
    <ion-modal
      :is-open="showEdit"
      :initial-breakpoint="1"
      :breakpoints="[0, 1]"
      @didDismiss="showEdit = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-buttons slot="start">
            <ion-button @click="showEdit = false">
              <Icon icon="lucide:x" />
            </ion-button>
          </ion-buttons>
          <ion-title>Edit Profile</ion-title>
          <ion-buttons slot="end">
            <ion-button :disabled="isSaving" @click="handleSave">
              <ion-spinner v-if="isSaving" name="crescent" style="width:18px;height:18px" />
              <span v-else style="font-weight:700;color:var(--color-brand)">Save</span>
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="edit-content">
        <div class="edit-body">

          <!-- ── Photo ──────────────────────────────────────────────────── -->
          <div class="edit-section">
            <p class="edit-section__title">Profile Photo</p>
            <div class="photo-picker">
              <div class="photo-picker__preview">
                <img
                  v-if="photoPreview || profilePhotoUrl"
                  :src="photoPreview || profilePhotoUrl"
                  alt="Profile photo"
                  class="photo-picker__img"
                />
                <span v-else class="photo-picker__initials">{{ initials }}</span>
              </div>
              <div class="photo-picker__actions">
                <label class="photo-btn photo-btn--primary">
                  <Icon icon="lucide:camera" aria-hidden="true" />
                  {{ photoPreview ? 'Change Photo' : 'Upload Photo' }}
                  <input
                    ref="photoInputRef"
                    type="file"
                    accept="image/*"
                    class="photo-btn__input"
                    @change="onPhotoSelected"
                  />
                </label>
                <button
                  v-if="photoPreview || profilePhotoUrl"
                  class="photo-btn photo-btn--danger"
                  @click="removePhoto"
                >
                  <Icon icon="lucide:trash-2" aria-hidden="true" />
                  Remove
                </button>
              </div>
              <p class="photo-picker__hint">JPG or PNG, max 5 MB</p>
            </div>
          </div>

          <!-- ── Personal details ───────────────────────────────────────── -->
          <div class="edit-section">
            <p class="edit-section__title">Personal Details</p>

            <div class="form-field">
              <label class="form-label">Full Name</label>
              <input v-model="editForm.name" type="text" class="form-input" placeholder="Your full name" />
            </div>
            <div class="form-field">
              <label class="form-label">Email</label>
              <input v-model="editForm.email" type="email" class="form-input" placeholder="your@email.com" />
            </div>
            <div class="form-field">
              <label class="form-label">Date of Birth</label>
              <input v-model="editForm.date_of_birth" type="date" class="form-input" />
            </div>
            <div class="form-field">
              <label class="form-label">Address</label>
              <textarea v-model="editForm.address" class="form-textarea" placeholder="Your residential address" rows="2" />
            </div>
          </div>

          <!-- ── Emergency contact ──────────────────────────────────────── -->
          <div class="edit-section">
            <p class="edit-section__title">Emergency Contact</p>
            <div class="form-field">
              <label class="form-label">Contact Name</label>
              <input v-model="editForm.emergency_contact_name" type="text" class="form-input" placeholder="Name of emergency contact" />
            </div>
            <div class="form-field">
              <label class="form-label">Contact Phone</label>
              <input v-model="editForm.emergency_contact_phone" type="tel" class="form-input" placeholder="+91 XXXXX XXXXX" />
            </div>
          </div>

          <!-- ── Documents ──────────────────────────────────────────────── -->
          <div class="edit-section">
            <p class="edit-section__title">Documents & KYC</p>
            <p class="edit-section__hint">Upload images or PDFs. Max 10 MB per file.</p>

            <div
              v-for="doc in documentSlots"
              :key="doc.type"
              class="doc-upload-row"
            >
              <div class="doc-upload-row__left">
                <span class="doc-upload-row__icon-wrap" :class="doc.uploaded ? 'doc-upload-row__icon-wrap--done' : 'doc-upload-row__icon-wrap--empty'">
                  <Icon :icon="doc.icon" aria-hidden="true" />
                </span>
                <div class="doc-upload-row__info">
                  <p class="doc-upload-row__label">{{ doc.label }}</p>
                  <p class="doc-upload-row__status">
                    <template v-if="doc.uploaded">
                      <Icon icon="lucide:check-circle-2" style="color:var(--color-success)" />
                      {{ doc.verified ? 'Verified' : 'Uploaded' }}
                    </template>
                    <template v-else>Not uploaded</template>
                  </p>
                  <button
                    v-if="doc.url"
                    type="button"
                    class="doc-upload-preview"
                    @click="viewDoc(doc)"
                  >
                    <span class="doc-upload-preview__thumb">
                      <img
                        v-if="isImageDocument(doc)"
                        :src="doc.url"
                        :alt="`${doc.label} preview`"
                        class="doc-upload-preview__img"
                      />
                      <Icon
                        v-else
                        :icon="isPdfDocument(doc) ? 'lucide:file-text' : 'lucide:file'"
                        aria-hidden="true"
                      />
                    </span>
                    <span class="doc-upload-preview__body">
                      <span class="doc-upload-preview__title">Preview</span>
                      <span class="doc-upload-preview__url">{{ previewFileLabel(doc) }}</span>
                    </span>
                    <Icon icon="lucide:external-link" class="doc-upload-preview__open" aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div class="doc-upload-row__actions">
                <label class="doc-action-btn doc-action-btn--upload">
                  <Icon :icon="doc.uploaded ? 'lucide:refresh-cw' : 'lucide:upload'" aria-hidden="true" />
                  {{ doc.uploaded ? 'Replace' : 'Upload' }}
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    class="doc-action-btn__input"
                    @change="(e) => onDocSelected(e, doc.type)"
                  />
                </label>
                <button
                  v-if="doc.uploaded"
                  class="doc-action-btn doc-action-btn--view"
                  @click="viewDoc(doc)"
                >
                  <Icon icon="lucide:eye" aria-hidden="true" />
                  View
                </button>
              </div>
            </div>
          </div>

          <p v-if="saveError" class="save-error">{{ saveError }}</p>

          <ion-button
            expand="block"
            :disabled="isSaving"
            class="save-btn"
            @click="handleSave"
          >
            <ion-spinner v-if="isSaving" name="crescent" slot="start" />
            Save Changes
          </ion-button>

          <div class="edit-bottom-spacer" />
        </div>
      </ion-content>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { onIonViewWillEnter } from '@ionic/vue'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getProfile, updateProfile, uploadProfileDocument, uploadProfilePhoto } from '@/shared/api'
import { useDrawer, useToast } from '@/shared/composables'
import { mediaUrl } from '@/shared/lib/media'
import type { UserProfile } from '@/shared/models'
import { useAuthStore, useUserTypeStore } from '@/shared/stores'

const router = useRouter()
const authStore = useAuthStore()
const userTypeStore = useUserTypeStore()
const { user } = storeToRefs(authStore)
const { isBeautician, isRider } = storeToRefs(userTypeStore)
const { showSuccess, showError } = useToast()
const { openDrawer } = useDrawer()

function openMenu(): void {
  openDrawer()
}

// ── Profile state ──────────────────────────────────────────────────────────

const profile = ref<UserProfile>({
  id: '',
  name: '',
  phone: '',
  user_type: 'beautician',
})
const isLoadingProfile = ref(false)

// ── Document slot definitions ──────────────────────────────────────────────

interface DocSlot {
  type: string
  label: string
  icon: string
  uploaded: boolean
  verified: boolean
  url?: string
  mimeType?: string
}

// Common docs for both roles
const COMMON_DOCS = [
  { type: 'aadhaar', label: 'Aadhaar Card', icon: 'lucide:id-card' },
  { type: 'pan', label: 'PAN Card', icon: 'lucide:credit-card' },
  { type: 'bank_account', label: 'Bank Account', icon: 'lucide:landmark' },
]

// Beautician-only docs
const BEAUTICIAN_DOCS = [{ type: 'portfolio', label: 'Portfolio Photos', icon: 'lucide:image' }]

// Rider-only docs
const RIDER_DOCS = [
  { type: 'driving_licence', label: 'Driving Licence', icon: 'lucide:car' },
  { type: 'puc', label: 'PUC Certificate', icon: 'lucide:shield-check' },
  { type: 'insurance', label: 'Insurance', icon: 'lucide:shield' },
  { type: 'rc_book', label: 'RC Book', icon: 'lucide:file-text' },
]

const documentSlots = computed<DocSlot[]>(() => {
  const roleDocs = isBeautician.value ? BEAUTICIAN_DOCS : isRider.value ? RIDER_DOCS : []
  return [...COMMON_DOCS, ...roleDocs].map(def => {
    const uploaded = profile.value.documents?.find(d => d.type === def.type)
    return {
      ...def,
      uploaded: !!uploaded?.url,
      verified: !!uploaded?.verified,
      url: uploaded?.url ? mediaUrl(uploaded.url) : undefined,
      mimeType: uploaded?.mime_type,
    }
  })
})

// ── Computed ───────────────────────────────────────────────────────────────

const initials = computed(() => {
  const name = profile.value.name ?? ''
  return name
    .split(' ')
    .slice(0, 2)
    .map(n => n[0]?.toUpperCase() ?? '')
    .join('')
})

const roleLabel = computed(() => (isBeautician.value ? 'Beautician' : 'Rider'))
const profilePhotoUrl = computed(() => mediaUrl(profile.value.photo?.url))

// ── Edit state ─────────────────────────────────────────────────────────────

const showEdit = ref(false)
const isSaving = ref(false)
const saveError = ref<string | null>(null)
const photoPreview = ref<string | null>(null)
const photoFile = ref<File | null>(null)

const editForm = ref({
  name: '',
  email: '',
  date_of_birth: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
})

function openEdit(): void {
  editForm.value = {
    name: profile.value.name ?? '',
    email: profile.value.email ?? '',
    date_of_birth: profile.value.date_of_birth ?? '',
    address: profile.value.address ?? '',
    emergency_contact_name: profile.value.emergency_contact_name ?? '',
    emergency_contact_phone: profile.value.emergency_contact_phone ?? '',
  }
  photoPreview.value = null
  photoFile.value = null
  saveError.value = null
  showEdit.value = true
}

// ── Photo handling ─────────────────────────────────────────────────────────

function onPhotoSelected(event: Event): void {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    showError('Photo must be under 5 MB')
    return
  }
  photoFile.value = file
  photoPreview.value = URL.createObjectURL(file)
}

function removePhoto(): void {
  photoPreview.value = null
  photoFile.value = null
  // When wired to API: also call DELETE /profile/photo
}

// ── Document handling ──────────────────────────────────────────────────────

async function onDocSelected(event: Event, type: string): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    showError('File must be under 10 MB')
    return
  }

  isSaving.value = true
  saveError.value = null
  try {
    const formData = new FormData()
    formData.append('document', file)
    const uploaded = await uploadProfileDocument(type, formData)
    const existing = [...(profile.value.documents ?? [])]
    const idx = existing.findIndex(d => d.type === type)
    if (idx >= 0) {
      existing[idx] = uploaded
    } else {
      existing.push(uploaded)
    }
    profile.value = { ...profile.value, documents: existing }
    authStore.setUserProfile(profile.value)
    showSuccess(
      `${uploaded.label ?? documentSlots.value.find(s => s.type === type)?.label ?? type} uploaded`
    )
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to upload document'
    showError(saveError.value)
  } finally {
    isSaving.value = false
    ;(event.target as HTMLInputElement).value = ''
  }
}

function viewDoc(doc: DocSlot): void {
  if (doc.url) window.open(doc.url, '_system')
}

// ── Save ───────────────────────────────────────────────────────────────────

async function handleSave(): Promise<void> {
  if (!editForm.value.name.trim()) {
    saveError.value = 'Name is required'
    return
  }
  isSaving.value = true
  saveError.value = null

  try {
    // Upload photo first if a new one was selected
    if (photoFile.value) {
      const formData = new FormData()
      formData.append('photo', photoFile.value)
      const updated = await uploadProfilePhoto(formData)
      profile.value = { ...profile.value, photo: updated.photo }
    }

    // Update profile fields
    const updates: Record<string, unknown> = {
      name: editForm.value.name,
    }
    if (editForm.value.email) updates.email = editForm.value.email
    if (editForm.value.date_of_birth) updates.date_of_birth = editForm.value.date_of_birth
    if (editForm.value.address) updates.address = editForm.value.address
    if (editForm.value.emergency_contact_name)
      updates.emergency_contact_name = editForm.value.emergency_contact_name
    if (editForm.value.emergency_contact_phone)
      updates.emergency_contact_phone = editForm.value.emergency_contact_phone

    const updated = await updateProfile(updates)
    profile.value = { ...profile.value, ...updated }

    // Sync to auth store so header/drawer reflect the new name
    authStore.setUserProfile(profile.value)

    isSaving.value = false
    showEdit.value = false
    showSuccess('Profile updated')
  } catch (err) {
    saveError.value = err instanceof Error ? err.message : 'Failed to save profile'
    showError(saveError.value)
    isSaving.value = false
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(iso?: string): string {
  if (!iso) return ''
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function goTo(path: string): void {
  router.push(path)
}

function isImageDocument(doc: DocSlot): boolean {
  if (doc.mimeType?.startsWith('image/')) return true
  return /\.(jpe?g|png|gif|webp)(\?.*)?$/i.test(doc.url ?? '')
}

function isPdfDocument(doc: DocSlot): boolean {
  if (doc.mimeType === 'application/pdf') return true
  return /\.pdf(\?.*)?$/i.test(doc.url ?? '')
}

function previewFileLabel(doc: DocSlot): string {
  if (isPdfDocument(doc)) return 'PDF document'
  if (isImageDocument(doc)) return 'Image file'
  return doc.mimeType || 'Uploaded file'
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

async function fetchProfile(): Promise<void> {
  isLoadingProfile.value = true
  try {
    const data = await getProfile()
    // Preserve user_type from auth store — server profile (Beautician/Rider model) doesn't include it
    const rawData = data as unknown as Record<string, unknown>
    const merged: UserProfile = {
      ...data,
      id: (rawData._id as string) ?? data.id,
      user_type: user.value?.user_type ?? data.user_type,
    }
    profile.value = merged
    // Sync to auth store
    authStore.setUserProfile(merged)
  } catch {
    // Fall back to auth store data
    if (user.value) {
      profile.value = {
        id: user.value.id,
        name: user.value.name,
        phone: user.value.phone,
        user_type: user.value.user_type,
        email: user.value.email ?? '',
        photo: user.value.photo,
      }
    }
  } finally {
    isLoadingProfile.value = false
  }
}

function handleRefresh(event: CustomEvent): void {
  fetchProfile().then(() => {
    const refresher = event.target as HTMLIonRefresherElement
    refresher.complete()
  })
}

onMounted(fetchProfile)
onIonViewWillEnter(() => {
  if (!profile.value.id) fetchProfile()
})
</script>

<style scoped>
.header-icon { font-size: 20px; }

.header-icon-btn {
  --background: transparent;
  --background-activated: transparent;
  --background-hover: transparent;
  --box-shadow: none;
  --padding-start: 8px;
  --padding-end: 8px;
  --color: var(--color-text);
}

/* ── Hero ────────────────────────────────────────────────────────────────── */

.profile-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 28px 16px 20px;
  background: linear-gradient(135deg, var(--color-brand) 0%, var(--color-hero-dark) 100%);
  animation: hero-entrance 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
}

@keyframes hero-entrance {
  from { opacity: 0; transform: translateY(-8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.profile-avatar {
  position: relative;
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: rgba(255,255,255,0.2);
  border: 3px solid rgba(255,255,255,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-bottom: 4px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1);
  animation: scale-in-bounce 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both;
}

.profile-avatar:active {
  transform: scale(0.93);
}

@keyframes scale-in-bounce {
  0%   { opacity: 0; transform: scale(0.7); }
  60%  { opacity: 1; transform: scale(1.06); }
  100% { opacity: 1; transform: scale(1); }
}

.profile-avatar__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar__initials {
  font-size: 30px;
  font-weight: 700;
  color: #fff;
}

.profile-avatar__edit-badge {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--color-brand);
  border: 2px solid #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #fff;
}

.profile-hero__name {
  margin: 0;
  font-size: var(--font-size-xl);
  font-weight: 800;
  color: #fff;
}

.profile-hero__role-badge {
  font-size: var(--font-size-xs);
  font-weight: 700;
  background: rgba(255,255,255,0.2);
  color: #fff;
  padding: 3px 12px;
  border-radius: var(--radius-full);
  border: 1px solid rgba(255,255,255,0.3);
}

.profile-hero__email {
  margin: 0;
  font-size: var(--font-size-sm);
  color: rgba(255,255,255,0.7);
}

/* ── Sections ────────────────────────────────────────────────────────────── */

.section { padding: 16px 16px 0; }

.section:nth-child(1) { animation: slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
.section:nth-child(2) { animation: slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) 0.18s both; }
.section:nth-child(3) { animation: slide-up 0.35s cubic-bezier(0.22, 1, 0.36, 1) 0.26s both; }

@keyframes slide-up {
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.section-title {
  margin: 0 0 10px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.section-header .section-title { margin-bottom: 0; }

.section-edit-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  background: none;
  border: none;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-brand);
  cursor: pointer;
  padding: 0;
}

/* ── Info card ───────────────────────────────────────────────────────────── */

.info-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.info-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--color-border);
}

.info-row:last-child { border-bottom: none; }

.info-row--nudge {
  background: none;
  border: none;
  width: 100%;
  cursor: pointer;
  text-align: left;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease;
}

.info-row--nudge:active { background: var(--color-background); }

.info-row__icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.info-row__icon-wrap--brand   { background: var(--color-brand-pale); color: var(--color-brand); }
.info-row__icon-wrap--warning { background: var(--color-warning-bg); color: var(--color-warning-text); }

.info-row__body { flex: 1; min-width: 0; }

.info-row__label {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.info-row__value {
  margin: 2px 0 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.info-row__sub {
  margin: 1px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

.info-row__nudge-icon { font-size: 18px; color: var(--color-brand); flex-shrink: 0; margin-top: 2px; }
.info-row__nudge-text { flex: 1; font-size: var(--font-size-base); font-weight: 500; color: var(--color-brand); }
.info-row__nudge-chevron { font-size: 16px; color: var(--color-text-muted); }

/* ── Documents grid ──────────────────────────────────────────────────────── */

.docs-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.doc-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.15s ease, transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.doc-card--uploaded { border-color: var(--color-success); }
.doc-card:active {
  background: var(--color-background);
  transform: scale(0.95);
}

.doc-card__icon-wrap {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

.doc-card__icon-wrap--done  { background: #d1fae5; color: #059669; }
.doc-card__icon-wrap--empty { background: var(--color-background); color: var(--color-text-muted); }

.doc-card__label {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  line-height: 1.3;
}

.doc-card__status {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: var(--font-size-xs);
  font-weight: 600;
}

.doc-card__status-icon--done  { color: var(--color-success); font-size: 14px; }
.doc-card__status-icon--empty { color: var(--color-text-muted); font-size: 14px; }
.doc-card__status-text--done  { color: var(--color-success-text); }
.doc-card__status-text--empty { color: var(--color-text-muted); }

/* ── Account links ───────────────────────────────────────────────────────── */

.links-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.link-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  background: none;
  border: none;
  border-bottom: 1px solid var(--color-border);
  cursor: pointer;
  text-align: left;
  width: 100%;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s ease, transform 0.12s ease;
}

.link-row:last-child { border-bottom: none; }
.link-row:active {
  background: var(--color-background);
  transform: scale(0.99);
}

.link-row__icon-wrap {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-lg);
  background: var(--color-brand-pale);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.link-row__label {
  flex: 1;
  font-size: var(--font-size-base);
  font-weight: 500;
  color: var(--color-text);
}

.link-row__chevron { font-size: 16px; color: var(--color-text-muted); }

.bottom-spacer { height: 24px; }

/* ══════════════════════════════════════════════════════════════════════════ */
/* Edit sheet                                                                 */
/* ══════════════════════════════════════════════════════════════════════════ */

.edit-content { --background: var(--color-background); }

.edit-body {
  padding: 0 16px 32px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.edit-section {
  padding: 20px 0 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.edit-section__title {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  padding-bottom: 2px;
  border-bottom: 1px solid var(--color-border);
}

.edit-section__hint {
  margin: -6px 0 0;
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}

/* ── Photo picker ────────────────────────────────────────────────────────── */

.photo-picker {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.photo-picker__preview {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: var(--color-border);
  border: 3px solid var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.photo-picker__img { width: 100%; height: 100%; object-fit: cover; }

.photo-picker__initials {
  font-size: 32px;
  font-weight: 700;
  color: var(--color-brand);
}

.photo-picker__actions {
  display: flex;
  gap: 10px;
}

.photo-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-sm);
  font-weight: 600;
  cursor: pointer;
  border: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
}

.photo-btn--primary { background: var(--color-brand-pale); color: var(--color-brand); }
.photo-btn--danger  { background: var(--color-error-bg);   color: var(--color-error-text); }

.photo-btn__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  font-size: 0;
}

.photo-picker__hint {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

/* ── Form fields ─────────────────────────────────────────────────────────── */

.form-field { display: flex; flex-direction: column; gap: 6px; }

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-input, .form-textarea {
  width: 100%;
  padding: 11px 13px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-lg);
  font-size: var(--font-size-base);
  color: var(--color-text);
  background: var(--color-surface);
  box-sizing: border-box;
  outline: none;
  font-family: inherit;
}

.form-input:focus, .form-textarea:focus { border-color: var(--color-brand); }
.form-textarea { resize: vertical; }

/* ── Document upload rows ────────────────────────────────────────────────── */

.doc-upload-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
}

.doc-upload-row__left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}

.doc-upload-row__icon-wrap {
  width: 38px;
  height: 38px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.doc-upload-row__icon-wrap--done  { background: #d1fae5; color: #059669; }
.doc-upload-row__icon-wrap--empty { background: var(--color-background); color: var(--color-text-muted); }

.doc-upload-row__info { flex: 1; min-width: 0; }

.doc-upload-row__label {
  margin: 0;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-upload-row__status {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 2px 0 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}

.doc-upload-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  margin: 8px 0 0;
  padding: 7px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: var(--color-background);
  color: var(--color-text);
  text-align: left;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.doc-upload-preview:active { transform: scale(0.99); }

.doc-upload-preview__thumb {
  width: 34px;
  height: 34px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  font-size: 17px;
}

.doc-upload-preview__img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.doc-upload-preview__body {
  display: flex;
  flex-direction: column;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.doc-upload-preview__title {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text);
}

.doc-upload-preview__url {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.doc-upload-preview__open {
  flex-shrink: 0;
  font-size: 15px;
  color: var(--color-text-muted);
}

.doc-upload-row__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}

.doc-action-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 11px;
  border-radius: var(--radius-lg);
  font-size: var(--font-size-xs);
  font-weight: 700;
  cursor: pointer;
  border: none;
  -webkit-tap-highlight-color: transparent;
  position: relative;
  overflow: hidden;
}

.doc-action-btn--upload { background: var(--color-brand-pale); color: var(--color-brand); }
.doc-action-btn--view   { background: var(--color-background); color: var(--color-text-secondary); border: 1px solid var(--color-border); }

.doc-action-btn__input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
  font-size: 0;
}

/* ── Save ────────────────────────────────────────────────────────────────── */

.save-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  text-align: center;
}

.save-btn { --border-radius: var(--radius-xl); }

.edit-bottom-spacer { height: 32px; }
</style>
