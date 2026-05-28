<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { CameraPreview } from '@capacitor-community/camera-preview'
import { modalController } from '@ionic/vue'
import { Icon } from '@iconify/vue'

const props = defineProps<{
  facingMode?: 'user' | 'environment'
}>()

const currentFacingMode = ref<'user' | 'environment'>(props.facingMode || 'environment')
const isCapturing = ref(false)
const previewImage = ref<string | null>(null)
const capturedBlob = ref<Blob | null>(null)

async function startCamera() {
  try {
    await CameraPreview.start({
      position: currentFacingMode.value === 'user' ? 'front' : 'rear',
      parent: 'camera-preview',
      toBack: true,
      className: 'camera-active',
      storeToFile: false,
      enableHighResolution: true,
      enableZoom: true,
      rotateWhenOrientationChanged: false, // Lock to portrait/default orientation
      disableExifHeaderStripping: false, // FORCE automatic rotation of captured image
      lockAndroidOrientation: true, // Lock Android to portrait while camera is active
    })
    document.body.classList.add('camera-active')
  } catch (err) {
    console.error('Failed to start camera preview:', err)
    modalController.dismiss(null, 'error')
  }
}

async function stopCamera() {
  try {
    await CameraPreview.stop()
    document.body.classList.remove('camera-active')
  } catch (err) {
    console.error('Failed to stop camera preview:', err)
  }
}

async function capture() {
  if (isCapturing.value) return
  isCapturing.value = true
  try {
    const result = await CameraPreview.capture({
      quality: 100,
    })

    const base64Data = result.value
    previewImage.value = `data:image/jpeg;base64,${base64Data}`
    capturedBlob.value = await (await fetch(previewImage.value)).blob()

    await stopCamera()
  } catch (err) {
    console.error('Capture failed:', err)
  } finally {
    isCapturing.value = false
  }
}

async function retake() {
  previewImage.value = null
  capturedBlob.value = null
  await startCamera()
}

function confirm() {
  if (capturedBlob.value) {
    modalController.dismiss(capturedBlob.value, 'confirm')
  }
}

async function flip() {
  try {
    await CameraPreview.flip()
    currentFacingMode.value = currentFacingMode.value === 'user' ? 'environment' : 'user'
  } catch (err) {
    console.error('Flip failed:', err)
  }
}

function cancel() {
  modalController.dismiss(null, 'cancel')
}

onMounted(() => {
  startCamera()
})

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <ion-page class="camera-modal-page">
    <!-- Underlay: Native Camera Target -->
    <div
      id="camera-preview"
      class="camera-underlay"
      v-show="!previewImage"
    ></div>

    <!-- Underlay: Captured Image Preview -->
    <div v-if="previewImage" class="camera-underlay static-preview">
      <img :src="previewImage" class="full-img" />
    </div>

    <!-- UI: Header -->
    <ion-header class="ion-no-border camera-header">
      <ion-toolbar class="transparent-toolbar">
        <ion-buttons slot="end">
          <ion-button @click="cancel" class="circle-btn">
            <Icon icon="lucide:x" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <!-- UI: Content -->
    <ion-content class="transparent-content" :scrollY="false">
      <div class="camera-body-overlay">
        <div
          v-if="!previewImage && currentFacingMode === 'user'"
          class="face-guide"
        ></div>
      </div>
    </ion-content>

    <!-- UI: Footer -->
    <ion-footer
      class="ion-no-border camera-footer"
      :class="{ 'preview-mode': !!previewImage }"
    >
      <ion-toolbar class="transparent-toolbar footer-toolbar">
        <div class="footer-content">
          <!-- Live Camera Controls -->
          <template v-if="!previewImage">
            <div class="footer-grid">
              <div class="grid-side"></div>

              <div class="grid-center">
                <button
                  class="shutter-btn"
                  @click="capture"
                  :disabled="isCapturing"
                >
                  <div class="shutter-inner"></div>
                </button>
              </div>

              <div class="grid-side">
                <button class="circle-icon-btn" @click="flip">
                  <Icon icon="lucide:refresh-cw" />
                </button>
              </div>
            </div>
          </template>

          <!-- Preview Controls -->
          <template v-else>
            <div class="preview-actions">
              <button class="text-action-btn" @click="retake">
                <div class="icon-wrap danger">
                  <Icon icon="lucide:rotate-ccw" />
                </div>
                <span>Retake</span>
              </button>

              <button class="text-action-btn" @click="confirm">
                <div class="icon-wrap success">
                  <Icon icon="lucide:check" />
                </div>
                <span>Upload</span>
              </button>
            </div>
          </template>
        </div>
      </ion-toolbar>
    </ion-footer>
  </ion-page>
</template>

<style scoped>
/* Page Layout */
.camera-modal-page {
  --background: transparent;
  background: transparent;
}

/* Background Layers */
.camera-underlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: -1;
  pointer-events: none;
}

.static-preview {
  background: black;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: -1;
}

.full-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  image-orientation: from-image;
}

/* Ionic Overrides for Transparency */
.transparent-toolbar {
  --background: transparent;
  --border-width: 0;
  --padding-top: 8px;
  --padding-bottom: 8px;
}

.transparent-content {
  --background: transparent;
}

/* Header */
.camera-header {
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.5), transparent);
}

.circle-btn {
  --background: rgba(0, 0, 0, 0.4);
  --border-radius: 50%;
  --color: white;
  width: 44px;
  height: 44px;
  margin-right: 12px;
}
.circle-btn::part(native) {
  padding: 0;
  border-radius: 50%;
}
.circle-btn Icon {
  font-size: 24px;
}

/* Body Overlay */
.camera-body-overlay {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.face-guide {
  width: 260px;
  height: 360px;
  border: 2px dashed rgba(255, 255, 255, 0.6);
  border-radius: 130px;
  box-shadow: 0 0 0 4000px rgba(0, 0, 0, 0.3); /* Subtle dimming around face */
}

/* Footer */
.camera-footer {
  background: linear-gradient(
    to top,
    rgba(0, 0, 0, 0.7) 0%,
    rgba(0, 0, 0, 0.4) 50%,
    transparent 100%
  );
  padding-bottom: env(safe-area-inset-bottom);
}
.camera-footer.preview-mode {
  background: rgba(0, 0, 0, 0.85);
}

.footer-content {
  padding: 20px 10px;
}

.footer-grid {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr 100px 1fr;
  align-items: center;
}

.grid-center,
.grid-side {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Buttons */
.shutter-btn {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: transparent;
  border: 4px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}

.shutter-inner {
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: white;
  transition: all 0.15s ease;
}

.shutter-btn:active .shutter-inner {
  transform: scale(0.85);
  background: #e0e0e0;
}

.shutter-btn:disabled {
  opacity: 0.5;
}

.circle-icon-btn {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  backdrop-filter: blur(8px);
  cursor: pointer;
}

/* Preview Actions */
.preview-actions {
  display: flex;
  justify-content: space-around;
  width: 100%;
  padding: 0 20px;
}

.text-action-btn {
  background: transparent;
  border: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 10px;
}

.text-action-btn .icon-wrap {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: white;
  transition: transform 0.2s;
}

.text-action-btn .icon-wrap.danger {
  background: rgba(255, 255, 255, 0.2);
}

.text-action-btn .icon-wrap.success {
  background: var(--ion-color-primary, #f06428);
  box-shadow: 0 4px 12px rgba(240, 100, 40, 0.3);
}

.text-action-btn:active .icon-wrap {
  transform: scale(0.9);
}

.text-action-btn span {
  color: white;
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.5px;
}
</style>
