<template>
  <ion-page>
    <ion-header :translucent="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/profile" />
        </ion-buttons>
        <ion-title>Support & Feedback</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <!-- Submit form -->
      <div class="support-form">
        <p class="support-form__intro">
          Have an issue or feedback? We're here to help.
        </p>

        <div class="form-field">
          <label class="form-label">Category</label>
          <select v-model="form.category" class="form-select">
            <option value="support">Support</option>
            <option value="feedback">Feedback</option>
            <option value="bug_report">Bug Report</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div class="form-field">
          <label class="form-label">Subject</label>
          <input
            v-model="form.subject"
            type="text"
            class="form-input"
            placeholder="Brief subject..."
            maxlength="200"
          />
        </div>

        <div class="form-field">
          <label class="form-label">Description</label>
          <textarea
            v-model="form.description"
            class="form-textarea"
            placeholder="Describe your issue or feedback in detail..."
            rows="5"
            maxlength="2000"
          />
          <span class="form-char-count">{{ form.description.length }}/2000</span>
        </div>

        <p v-if="submitError" class="form-error">{{ submitError }}</p>

        <ion-button
          expand="block"
          :disabled="isSubmitting || !form.subject.trim() || !form.description.trim()"
          class="submit-btn"
          @click="handleSubmit"
        >
          <ion-spinner v-if="isSubmitting" name="crescent" slot="start" />
          Submit
        </ion-button>
      </div>

      <!-- Past submissions -->
      <div v-if="tickets.length > 0" class="tickets-section">
        <p class="tickets-section__title">Past Submissions</p>
        <div class="tickets-list">
          <div v-for="ticket in tickets" :key="ticket.id ?? ticket._id" class="ticket-card">
            <div class="ticket-card__header">
              <span class="ticket-card__category">{{ formatCategory(ticket.category) }}</span>
              <span v-if="ticket.status" class="ticket-card__status">{{ ticket.status }}</span>
            </div>
            <p class="ticket-card__subject">{{ ticket.subject }}</p>
            <p class="ticket-card__desc">{{ ticket.description }}</p>
            <p v-if="ticket.created_at" class="ticket-card__date">
              {{ formatDate(ticket.created_at) }}
            </p>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton,
  IonContent, IonButton, IonSpinner,
} from '@ionic/vue'
import { createSupportTicket, getSupportTickets } from '@/shared/api'
import { useToast } from '@/shared/composables'
import type { SupportCategory, SupportTicket } from '@/shared/models'

const { showSuccess, showError } = useToast()

const tickets = ref<SupportTicket[]>([])
const isSubmitting = ref(false)
const submitError = ref<string | null>(null)

const form = ref({
  category: 'support' as SupportCategory,
  subject: '',
  description: '',
})

async function handleSubmit(): Promise<void> {
  isSubmitting.value = true
  submitError.value = null
  try {
    const ticket = await createSupportTicket({
      category: form.value.category,
      subject: form.value.subject.trim(),
      description: form.value.description.trim(),
    })
    tickets.value.unshift(ticket)
    form.value = { category: 'support', subject: '', description: '' }
    showSuccess('Submitted successfully')
  } catch (err) {
    submitError.value = err instanceof Error ? err.message : 'Failed to submit'
    showError(submitError.value)
  } finally {
    isSubmitting.value = false
  }
}

function formatCategory(cat: SupportCategory): string {
  const map: Record<SupportCategory, string> = {
    support: 'Support',
    feedback: 'Feedback',
    bug_report: 'Bug Report',
    other: 'Other',
  }
  return map[cat] ?? cat
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

onMounted(async () => {
  try {
    tickets.value = await getSupportTickets()
  } catch {
    // non-critical
  }
})
</script>

<style scoped>
.support-form {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.support-form__intro {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: 1.5;
}

.form-field { display: flex; flex-direction: column; gap: 6px; }

.form-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text-secondary);
}

.form-input,
.form-select,
.form-textarea {
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

.form-input:focus,
.form-select:focus,
.form-textarea:focus { border-color: var(--color-brand); }

.form-textarea { resize: vertical; }

.form-char-count {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-align: right;
}

.form-error {
  margin: 0;
  font-size: var(--font-size-sm);
  color: var(--color-error-text);
  text-align: center;
}

.submit-btn { --border-radius: var(--radius-xl); }

/* Past tickets */
.tickets-section {
  padding: 0 16px 24px;
}

.tickets-section__title {
  margin: 0 0 10px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.tickets-list { display: flex; flex-direction: column; gap: 10px; }

.ticket-card {
  background: var(--color-surface);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 14px 16px;
}

.ticket-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ticket-card__category {
  font-size: var(--font-size-xs);
  font-weight: 700;
  color: var(--color-brand);
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.ticket-card__status {
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
  text-transform: capitalize;
}

.ticket-card__subject {
  margin: 0 0 4px;
  font-size: var(--font-size-base);
  font-weight: 600;
  color: var(--color-text);
}

.ticket-card__desc {
  margin: 0 0 6px;
  font-size: var(--font-size-sm);
  color: var(--color-text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.ticket-card__date {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>
