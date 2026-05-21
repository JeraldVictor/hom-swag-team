<template>
  <ion-page>
    <ion-header :translucent="true" class="ion-no-border">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/orders" text="" />
        </ion-buttons>
        <ion-title>Order #{{ order?.order_number || '...' }}</ion-title>
        <ion-buttons slot="end">
          <AppButton v-if="order && !isCompleted" variant="clear" icon-only icon="lucide:refresh-cw" @click="handleRefresh" :class="{ 'spin': isLoading }" />
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="handleRefresh" class="modern-refresher">
        <ion-refresher-content pulling-icon="lucide:arrow-down" refreshing-spinner="crescent" />
      </ion-refresher>
      <input
        ref="proofInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        style="display: none"
        @change="handleCompletionProofChange"
      />
      <input
        ref="setupInput"
        type="file"
        accept="image/*"
        multiple
        hidden
        style="display: none"
        @change="handleSetupPhotosChange"
      />
      <div v-if="isLoading && !order" class="loading-state">
        <ion-spinner name="crescent" />
        <p>Loading order details...</p>
      </div>

      <div v-else-if="error && !order" class="error-state">
        <Icon icon="lucide:alert-circle" class="error-icon" />
        <h3>Something went wrong</h3>
        <p>{{ error }}</p>
        <AppButton variant="outline" icon="lucide:refresh-cw" @click="handleRefresh">Retry</AppButton>
      </div>

      <template v-else-if="order">
        <!-- Hero Section: Customer & Quick Info -->
        <div class="order-hero">
          <div class="hero-content">
            <div v-if="!isCustomerHidden" class="customer-compact">
              <div class="compact-top-row">
                <div class="order-id-badge">
                  <Icon icon="lucide:hash" class="hash-icon" />
                  <span>{{ order.order_number }}</span>
                </div>
                <AppBadge :variant="(statusVariant as any)" class="status-badge-hero">
                  {{ orderStatusLabel }}
                </AppBadge>
              </div>
              <h2 class="customer-name-compact">{{ order.customer?.full_name || 'Customer' }}</h2>
              <div class="compact-details">
                <div class="compact-detail-row">
                  <Icon icon="lucide:map-pin" class="compact-icon" />
                  <span>{{ fullAddress }}</span>
                </div>
                <div v-if="order.customer?.phone" class="compact-detail-row">
                  <Icon icon="lucide:phone" class="compact-icon" />
                  <span>{{ order.customer.phone }}</span>
                </div>
              </div>
            </div>

            <div v-else class="masked-hero">
              <div class="masked-hero-header">
                <div>
                  <p class="masked-hero-label">Order</p>
                  <h2 class="masked-hero-number">#{{ order.order_number }}</h2>
                </div>
                <AppBadge :variant="(statusVariant as any)" class="status-badge-hero">
                  {{ orderStatusLabel }}
                </AppBadge>
              </div>
              <div class="masked-hero-grid">
                <div class="masked-meta-item">
                  <p class="meta-label">Amount</p>
                  <p class="meta-value">₹{{ order.total ?? 0 }}</p>
                </div>
                <div class="masked-meta-item">
                  <p class="meta-label">Date</p>
                  <p class="meta-value">{{ formattedDate }}</p>
                </div>
              </div>
            </div>


            <div class="hero-actions" v-if="!isCompleted && !isCustomerHidden">
              <div class="main-hero-btns">
                <AppButton expand="block" size="lg" icon="lucide:navigation" class="nav-btn-modern" @click="navigateToLocation">
                  Navigate
                </AppButton>
                <AppButton v-if="order && !isCompleted" expand="block" size="lg" icon="lucide:car-taxi-front" class="ride-btn-modern" @click="showRideModal = true">
                  Book Ride
                </AppButton>
              </div>
              <div class="dual-btns-modern">
                <AppButton icon="lucide:copy" size="sm" @click="copyAddress" class="action-chip">
                  Copy Address
                </AppButton>
                <AppButton icon="lucide:phone" size="sm" :href="'tel:' + order.customer?.phone" class="action-chip">
                  Call
                </AppButton>
              </div>
            </div>
          </div>
        </div>

        <div class="order-content anim-fade-in">
          <div class="content-card trip-card" v-if="showAssignedTripInfo && assignedTrip">
            <div class="card-header">
              <Icon icon="lucide:truck" class="header-icon" />
              <h3>Assigned Rider & Trip</h3>
            </div>
            <div class="trip-info-grid">
              <div class="trip-info-row">
                <span>Trip number</span>
                <strong>{{ assignedTrip.trip_number || '—' }}</strong>
              </div>
              <div class="trip-info-row" v-if="assignedTrip.rider?.name">
                <span>Rider</span>
                <strong>{{ assignedTrip.rider.name }}</strong>
              </div>
              <div class="trip-info-row" v-if="assignedTrip.rider?.phone">
                <span>Rider phone</span>
                <a :href="`tel:${assignedTrip.rider.phone}`">{{ assignedTrip.rider.phone }}</a>
              </div>
              <div class="trip-info-row" v-if="assignedTrip.rider?.vehicle_number || assignedTrip.rider?.registration_number">
                <span>Vehicle</span>
                <strong>
                  {{ assignedTrip.rider?.vehicle_number || assignedTrip.rider?.registration_number }}
                </strong>
              </div>
              <div class="trip-info-row">
                <span>Trip status</span>
                <strong>{{ assignedTrip.kanban_state || 'Assigned' }}</strong>
              </div>
              <div class="trip-info-row" v-if="assignedTrip.start_time">
                <span>Start</span>
                <strong>{{ assignedTrip.start_time }}</strong>
              </div>
              <div class="trip-info-row" v-if="assignedTrip.end_time">
                <span>End</span>
                <strong>{{ assignedTrip.end_time }}</strong>
              </div>
            </div>
          </div>

          <div class="content-card context-card" v-if="!isCustomerHidden && hasOrderContext">
            <div class="card-header">
              <Icon icon="lucide:notebook-tabs" class="header-icon" />
              <h3>Order Context & Info</h3>
            </div>
            
            <div class="context-grid">
              <!-- Customer Notes -->
              <div v-if="order.notes" class="context-box note-box">
                <div class="box-header">
                  <Icon icon="lucide:message-square-quote" />
                  <span>Customer Note</span>
                </div>
                <p>{{ order.notes }}</p>
              </div>

              <!-- Instructions -->
              <div v-if="order.custom_instruction || order.instruction_presets?.length" class="context-box instruction-box">
                <div class="box-header">
                  <Icon icon="lucide:clipboard-list" />
                  <span>Special Instructions</span>
                </div>
                <p v-if="order.custom_instruction" :class="{ 'mb-2': order.instruction_presets?.length }">{{ order.custom_instruction }}</p>
                <div v-if="order.instruction_presets?.length" class="preset-chips">
                  <AppBadge v-for="preset in order.instruction_presets" :key="preset._id" variant="info" size="sm">
                    {{ preset.text || preset.description }}
                  </AppBadge>
                </div>
              </div>

              <!-- Staff/Internal -->
              <div v-if="order.staff_notes || order.payment?.internal_comment" class="context-box internal-box">
                <div class="box-header">
                  <Icon icon="lucide:shield-alert" />
                  <span>Internal Reference</span>
                </div>
                <p v-if="order.staff_notes"><strong>Staff:</strong> {{ order.staff_notes }}</p>
                <p v-if="order.payment?.internal_comment" :class="{ 'mt-1': order.staff_notes }">
                  <strong>Payment:</strong> {{ order.payment.internal_comment }}
                </p>
              </div>
            </div>
          </div>

          <!-- Items Section -->
          <div class="content-card">
            <div class="card-header">
              <Icon icon="lucide:shopping-bag" class="header-icon" />
              <h3>Services & Items</h3>
              <AppButton 
                v-if="canUpgrade" 
                variant="outline" 
                size="sm" 
                class="ms-auto"
                @click="router.push(`/orders/${orderId}/edit`)"
              >
                Add / Edit Items
              </AppButton>
            </div>
            <div class="line-items">
              <div v-for="item in order.products" :key="item.product_id" class="modern-item-card">
                <div class="mic-header">
                  <div class="mic-title-row">
                    <span class="mic-title">{{ item.title }}</span>
                    <div class="mic-badges">
                      <AppBadge v-if="item.total === 0" variant="success" size="sm">Free</AppBadge>
                      <AppBadge v-if="item.type === 'package'" variant="info" size="sm">Package</AppBadge>
                    </div>
                  </div>
                  <div class="mic-meta">
                    <span class="mic-price-info">{{ item.quantity }} × ₹{{ item.price }}</span>
                    <span class="mic-total">₹{{ item.total }}</span>
                  </div>
                  <div v-if="item.duration || item.type" class="mic-attributes">
                    <span v-if="item.duration" class="mic-attr">
                      <Icon icon="lucide:clock" class="mic-icon" /> {{ item.duration }} mins
                    </span>
                    <span v-if="item.type" class="mic-attr">
                      <Icon icon="lucide:layers" class="mic-icon" /> {{ item.type === 'package' ? 'Package item' : 'Service item' }}
                    </span>
                  </div>
                </div>

                <div v-if="item.type === 'package' && getSelectedServiceItems(item).length" class="mic-sub-section">
                  <div class="mic-sub-header">Included Services</div>
                  <div class="mic-sub-list">
                    <div v-for="service in getSelectedServiceItems(item)" :key="service.product_id || service._id" class="mic-sub-item">
                      <Icon icon="lucide:check-circle" class="mic-sub-icon text-success" />
                      <span>{{ service.title || service.name }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="getSelectedOptions(item).length" class="mic-sub-section">
                  <div class="mic-sub-header">Add-ons / Options</div>
                  <div class="mic-sub-list">
                    <div v-for="opt in getSelectedOptions(item)" :key="opt.product_option_id || opt.id || opt._id" class="mic-sub-item mic-item-row">
                      <div class="mic-item-info">
                        <span class="mic-item-title">{{ opt.title }}</span>
                      </div>
                      <span class="mic-item-price">₹{{ opt.price ?? opt.min_price ?? opt.base_price ?? 0 }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="getSelectedFreeItems(item).length" class="mic-sub-section">
                  <div class="mic-sub-header">Free Perks</div>
                  <div class="mic-sub-list">
                    <div v-for="free in getSelectedFreeItems(item)" :key="free.product_id || free._id" class="mic-sub-item">
                      <Icon icon="lucide:gift" class="mic-sub-icon text-primary" />
                      <span>{{ free.title }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="canUpgrade && item.type !== 'package'" class="mic-actions">
                  <AppButton variant="outline" size="sm" icon="lucide:arrow-up" @click="openUpgradeModal(item as any)">
                    Upgrade
                  </AppButton>
                </div>
              </div>
            </div>

            <div class="order-summary-footer modern-summary-card">
              <div class="summary-card-header">
                <div>
                  <p class="summary-label">Order summary</p>
                </div>
              </div>
              <div class="summary-list">
                <div class="summary-item">
                  <span>Subtotal</span>
                  <strong>₹{{ order.subtotal ?? 0 }}</strong>
                </div>
                <div class="summary-item">
                  <span>Other Charges</span>
                  <strong class="text-danger"> ₹{{ Math.abs((order.subtotal ?? 0) - (order.total ?? 0)) }}</strong>
                </div>
                <div class="summary-total">
                  <span>Total Amount</span>
                  <strong>₹{{ order.total ?? 0 }}</strong>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment Info -->
          <div v-if="!isCustomerHidden || isCompleted" class="content-card payment-card">
            <div class="card-header">
              <Icon icon="lucide:credit-card" class="header-icon" />
              <h3>Payment</h3>
              <AppBadge :variant="(paymentStatusVariant as any)" class="ms-auto">
                {{ order.payment?.status?.toUpperCase() || 'Pending' }}
              </AppBadge>
            </div>
            <div class="payment-method">
              <p>Payment Type: <strong>{{ order.payment?.method?.toUpperCase() || 'COD / UPI' }}</strong></p>
              <p v-if="order.payment?.reference">Reference: <strong>{{ order.payment.reference }}</strong></p>
            </div>
            <div class="payment-details-grid">
              <div class="payment-detail-item" v-if="(order.payment?.cod_amount ?? parsedPaymentRemark?.cod ?? 0) > 0">
                <span>Cash (COD)</span>
                <strong>₹{{ order.payment?.cod_amount ?? parsedPaymentRemark?.cod }}</strong>
              </div>
              <div class="payment-detail-item" v-if="(order.payment?.upi_amount ?? parsedPaymentRemark?.upi ?? 0) > 0">
                <span>UPI</span>
                <strong>₹{{ order.payment?.upi_amount ?? parsedPaymentRemark?.upi }}</strong>
              </div>
              <div class="payment-detail-item" v-if="(order.payment?.tip ?? order.tip ?? parsedPaymentRemark?.tip ?? 0) > 0">
                <span>Tip</span>
                <strong class="text-brand">₹{{ order.payment?.tip ?? order.tip ?? parsedPaymentRemark?.tip }}</strong>
              </div>
              <div class="payment-detail-item">
                <span>Total Collected</span>
                <strong :class="{ 'text-success': order.payment?.status?.toLowerCase() === 'paid' }">
                  {{ order.payment?.amount_paid != null ? `₹${order.payment.amount_paid}` : '—' }}
                </strong>
              </div>
              <div class="payment-detail-item full-width" v-if="order.payment?.remark && !parsedPaymentRemark">
                <span>Remark</span>
                <p class="remark-text">{{ order.payment.remark }}</p>
              </div>
            </div>
            <div class="payment-hint" v-if="order.payment?.status?.toLowerCase() !== 'paid' && !isCompleted">
              <p>
                Collect cash on delivery or ask the customer to scan the office UPI QR code below.
              </p>
            </div>
            <div v-if="order.office_payment_qr_code?.url && !isCompleted" class="qr-code-block">
              <p class="qr-title">Office UPI QR Code</p>
              <img :src="mediaUrl(order.office_payment_qr_code?.url)" alt="Office payment QR code" />
            </div>
          </div>

          <div v-if="!isCustomerHidden || isCompleted" class="content-card proof-card">
            <div class="card-header">
              <Icon icon="lucide:camera" class="header-icon" />
              <h3>Verification Photos</h3>
            </div>
            <div class="proof-group">
              <div class="proof-entry">
                <div class="proof-label-row">
                  <p class="proof-label">Arrival Selfie</p>
                  <AppButton 
                    v-if="order.status.toLowerCase() === 'ongoing' && !order.arrival_selfie"
                    variant="clear" 
                    size="sm" 
                    icon="lucide:camera"
                    @click="handleUploadSelfie"
                    class="action-btn-sm"
                  >
                    Take Selfie
                  </AppButton>
                </div>
                <div class="proof-preview" v-if="order.arrival_selfie?.url" @click="openGallery(mediaUrl(order.arrival_selfie.url))">
                  <img :src="mediaUrl(order.arrival_selfie?.url)" alt="Arrival selfie" />
                </div>
                <p v-else class="proof-empty">No arrival selfie uploaded yet.</p>
              </div>
              <div class="proof-entry">
                <div class="proof-label-row">
                  <p class="proof-label">Setup Photos</p>
                  <div
                    class="proof-actions"
                    v-if="order.status.toLowerCase() === 'reached_customer_place' && order.arrival_selfie"
                  >
                    <AppButton 
                      variant="clear" 
                      size="sm" 
                      icon="lucide:camera"
                      @click="handleCaptureSetupPhoto"
                      class="action-btn-sm"
                    >
                      Camera
                    </AppButton>
                    <AppButton 
                      variant="clear" 
                      size="sm" 
                      icon="lucide:upload"
                      @click="triggerSetupInput"
                      class="action-btn-sm"
                    >
                      Upload
                    </AppButton>
                  </div>
                </div>
                <div v-if="setupPhotos.length" class="proof-list">
                  <div v-for="(image, index) in setupPhotos" :key="index" class="proof-thumbnail" @click="openGallery(mediaUrl(image.url))">
                    <img :src="mediaUrl(image.url)" :alt="`Setup photo ${index + 1}`" />
                  </div>
                </div>
                <p v-else class="proof-empty">No setup photos uploaded yet.</p>
              </div>

              <div class="proof-entry">
                <div class="proof-label-row">
                  <p class="proof-label">Payment Proof</p>
                  <div class="proof-actions" v-if="order.status.toLowerCase() === 'started'">
                    <AppButton 
                      variant="clear" 
                      size="sm" 
                      icon="lucide:camera"
                      @click="handleCapturePaymentProof"
                      class="action-btn-sm"
                    >
                      Camera
                    </AppButton>
                    <AppButton 
                      variant="clear" 
                      size="sm" 
                      icon="lucide:upload"
                      @click="triggerProofInput"
                      class="action-btn-sm"
                    >
                      Upload
                    </AppButton>
                  </div>
                </div>
                <div v-if="proofImages.length" class="proof-list">
                  <div v-for="(image, index) in proofImages" :key="index" class="proof-thumbnail" @click="openGallery(mediaUrl(image.url))">
                    <img :src="mediaUrl(image.url)" :alt="`Payment proof ${index + 1}`" />
                  </div>
                </div>
                <p v-else class="proof-empty">No payment proof uploaded yet.</p>
              </div>
            </div>
          </div>

          <div
            class="content-card payment-status-editor"
            v-if="!isCustomerHidden && order.status.toLowerCase() === 'started' && proofImages.length"
          >
            <div class="card-header">
              <Icon icon="lucide:sliders-horizontal" class="header-icon" />
              <h3>Payment Status</h3>
            </div>
            <div class="payment-status-row">
              <select v-model="paymentStatus" class="form-select">
                <option value="" disabled>Select payment status</option>
                <option v-for="option in paymentStatusOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
              <AppButton
                variant="outline"
                size="sm"
                :loading="isUpdating"
                :disabled="!paymentStatus || paymentStatus === order.payment?.status?.toLowerCase()"
                @click="handleSavePaymentStatus"
              >
                Save status
              </AppButton>
            </div>
            <p class="hint">
              Choose Paid, Unpaid, or Conflict after uploading payment proof. This must be updated before completing the order.
            </p>
          </div>

        </div>

        <div class="action-footer" v-if="!isCompleted && !isCustomerHidden">
          <div v-if="error" class="error-banner">{{ error }}</div>
          <!-- Main Actions -->
          <div class="main-actions">
            <AppButton 
              v-if="nextActionLabel"
              expand="block"
              size="lg"
              :loading="isUpdating"
              :disabled="isBookingDateFuture"
              :icon="isSelfieStep ? 'lucide:camera' : undefined"
              @click="handleMainAction"
              class="primary-action-btn-custom"
            >
              {{ nextActionLabel }}
            </AppButton>
            
            <div class="date-restriction-tip" v-if="isBookingDateFuture && !isCompleted && order" style="text-align: center; color: var(--color-text-muted); font-size: 13px; margin: 8px 0; padding: 8px; background: var(--color-surface); border-radius: 8px;">
              {{ bookingDateRestrictionMessage }}
            </div>
 
            <AppButton 
              v-if="canCancel && !isBookingDateFuture"
              expand="block"
              variant="outline"
              color="danger" 
              icon="lucide:ban"
              @click="openCancelModal"
              style="margin-top: 12px;"
            >
              Customer Request to Cancel
            </AppButton>
          </div>
        </div>
      </template>
    </ion-content>

    <!-- OTP Verification Drawer -->
    <ion-modal 
      :is-open="showOtpInput" 
      @didDismiss="showOtpInput = false" 
      class="otp-modal"
      :initial-breakpoint="0.5"
      :breakpoints="[0, 0.5, 0.7]"
      handle-behavior="cycle"
    >
      <div class="otp-drawer-content">
        <div class="otp-header">
          <div class="otp-icon-wrapper">
            <Icon icon="lucide:shield-check" />
          </div>
          <h3>Verify Service OTP</h3>
          <p>Enter the 6-digit code provided by the customer to start the service.</p>
        </div>
        
        <div class="otp-input-section">
          <OtpInput v-model="otpValue" @complete="handleVerifyOtp" />
        </div>

        <div class="otp-footer">
          <AppButton 
            expand="block" 
            size="lg" 
            :disabled="otpValue.length < 6" 
            :loading="isVerifyingOtp" 
            @click="handleVerifyOtp"
          >
            Verify & Start Service
          </AppButton>
          <AppButton variant="ghost" expand="block" @click="showOtpInput = false">
            Cancel
          </AppButton>
        </div>
      </div>
    </ion-modal>

    <!-- Upgrade Modal -->
    <ion-modal :is-open="showUpgradeModal" @didDismiss="showUpgradeModal = false" class="upgrade-modal">
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>Upgrade Service</ion-title>
          <ion-buttons slot="end">
            <AppButton variant="clear" @click="showUpgradeModal = false">Close</AppButton>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <div v-if="isFetchingUpgrades" class="modal-loading">
          <ion-spinner name="crescent" />
          <p>Finding better options...</p>
        </div>
        <div v-else-if="upgradableProducts.length === 0" class="modal-empty">
          <Icon icon="lucide:info" />
          <p>No upgrades available for this item.</p>
        </div>
        <div v-else class="upgrade-list">
          <div v-for="p in upgradableProducts" :key="p._id || p.id" class="upgrade-option" @click="handleUpgrade(p)">
            <div class="upgrade-option__info">
              <h4>{{ p.title || p.name }}</h4>
              <p>{{ p.short_description || p.description }}</p>
              <span class="price-diff">Upgrade for +₹{{ (p.base_price || p.price) - (selectedItem?.price || 0) }}</span>
            </div>
            <Icon icon="lucide:chevron-right" />
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Cancel Modal -->
    <ion-modal 
      :is-open="showCancelModal" 
      @didDismiss="showCancelModal = false" 
      class="cancel-modal"
      :initial-breakpoint="0.85"
      :breakpoints="[0, 0.85, 1]"
      handle-behavior="cycle"
    >
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>Cancel Order</ion-title>
          <ion-buttons slot="end">
            <AppButton variant="clear" icon-only icon="lucide:x" @click="showCancelModal = false" />
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <div class="cancel-container">
          <div class="cancel-warning">
            <div class="warning-icon-wrapper">
              <Icon icon="lucide:alert-triangle" />
            </div>
            <h3>Are you sure?</h3>
            <p>Cancellation is permanent. Please ensure you have valid reasons and the customer's consent.</p>
          </div>

          <div class="cancel-form-section">
            <div class="form-label-group">
              <Icon icon="lucide:clipboard-edit" />
              <label class="form-label">Reason for Cancellation</label>
            </div>
            <textarea
              v-model="cancelReason"
              placeholder="Provide a detailed reason for cancellation..."
              rows="4"
              class="modern-textarea"
            ></textarea>
          </div>

          <div class="cancel-form-section">
            <p class="form-hint">A cancellation request will be sent to admin for review.</p>
          </div>

          <div class="cancel-actions">
            <AppButton
              variant="danger"
              expand="block"
              :disabled="!cancelReason.trim()"
              :loading="isUpdating"
              @click="handleCancel"
            >
              Confirm & Cancel Order
            </AppButton>
            <AppButton variant="ghost" expand="block" @click="showCancelModal = false">
              Go Back
            </AppButton>
          </div>
        </div>
      </ion-content>
    </ion-modal>

    <!-- Payment Details Modal -->
    <ion-modal
      :is-open="showPaymentModal"
      @didDismiss="showPaymentModal = false"
      class="payment-modal"
      :initial-breakpoint="0.92"
      :breakpoints="[0, 0.92, 1]"
      handle-behavior="cycle"
    >
      <ion-header class="ion-no-border">
        <ion-toolbar class="payment-modal-toolbar">
          <ion-title>
            <div class="payment-modal-title">
              <div class="payment-modal-title-icon">
                <Icon icon="lucide:indian-rupee" />
              </div>
              <span>Payment details</span>
            </div>
          </ion-title>
          <ion-buttons slot="end">
            <ion-button fill="clear" shape="round" @click="showPaymentModal = false">
              <Icon icon="lucide:x" slot="icon-only" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <div class="payment-dialog-body">

          <!-- Bill summary banner -->
          <div class="pdb-bill-banner">
            <div class="pdb-bill-row">
              <span class="pdb-bill-label">Order total</span>
              <strong class="pdb-bill-amount">₹{{ order?.total ?? 0 }}</strong>
            </div>
            <div class="pdb-bill-divider" />
            <div class="pdb-bill-row pdb-bill-row--sub">
              <span>Subtotal</span>
              <span>₹{{ order?.subtotal ?? 0 }}</span>
            </div>
            <div class="pdb-bill-row pdb-bill-row--sub" v-if="(order?.total ?? 0) !== (order?.subtotal ?? 0)">
              <span>Other charges</span>
              <span>₹{{ Math.abs((order?.subtotal ?? 0) - (order?.total ?? 0)) }}</span>
            </div>
          </div>

          <!-- Status -->
          <div class="pdb-section">
            <p class="pdb-section-label">Payment status</p>
            <div class="status-chip-row">
              <button
                v-for="option in paymentStatusOptions"
                :key="option.value"
                class="status-chip"
                :class="{ 'status-chip--active': paymentStatus === option.value, [`status-chip--${option.value}`]: true }"
                @click="paymentStatus = option.value as any"
              >
                <Icon :icon="option.value === 'paid' ? 'lucide:check-circle' : option.value === 'unpaid' ? 'lucide:clock' : 'lucide:alert-circle'" />
                {{ option.label }}
              </button>
            </div>
          </div>

          <!-- Amount breakdown -->
          <div class="pdb-section">
            <p class="pdb-section-label">Amount breakdown</p>
            <ion-list lines="none" class="pdb-list">
              <ion-item class="pdb-item">
                <div slot="start" class="pdb-item-icon pdb-icon-cash">
                  <Icon icon="lucide:banknote" />
                </div>
                <ion-label>
                  <p class="pdb-item-label">Cash on Delivery</p>
                </ion-label>
                <ion-input
                  slot="end"
                  type="number"
                  inputmode="numeric"
                  :min="0"
                  v-model="paymentCodAmount"
                  placeholder="0"
                  class="pdb-amount-input"
                />
              </ion-item>
              <ion-item class="pdb-item">
                <div slot="start" class="pdb-item-icon pdb-icon-upi">
                  <Icon icon="lucide:smartphone" />
                </div>
                <ion-label>
                  <p class="pdb-item-label">UPI</p>
                </ion-label>
                <ion-input
                  slot="end"
                  type="number"
                  inputmode="numeric"
                  :min="0"
                  v-model="paymentUpiAmount"
                  placeholder="0"
                  class="pdb-amount-input"
                />
              </ion-item>
              <ion-item class="pdb-item">
                <div slot="start" class="pdb-item-icon pdb-icon-tip">
                  <Icon icon="lucide:heart" />
                </div>
                <ion-label>
                  <p class="pdb-item-label">Tip</p>
                </ion-label>
                <ion-input
                  slot="end"
                  type="number"
                  inputmode="numeric"
                  :min="0"
                  v-model="paymentTipAmount"
                  placeholder="0"
                  class="pdb-amount-input"
                />
              </ion-item>
            </ion-list>

            <!-- Total pill -->
            <div class="pdb-total">
              <span>Total collected</span>
              <strong>₹{{ paymentTotalCollected }}</strong>
            </div>
          </div>

          <!-- UPI reference -->
          <div class="pdb-section">
            <p class="pdb-section-label">UPI reference <span class="pdb-optional">(optional)</span></p>
            <ion-list lines="none" class="pdb-list">
              <ion-item class="pdb-item">
                <div slot="start" class="pdb-item-icon pdb-icon-ref">
                  <Icon icon="lucide:hash" />
                </div>
                <ion-input
                  v-model="paymentReferenceInput"
                  placeholder="Transaction ID or UTR number"
                  clearInput
                />
              </ion-item>
            </ion-list>
          </div>

          <!-- Notes -->
          <div class="pdb-section">
            <p class="pdb-section-label">Notes <span class="pdb-optional">(optional)</span></p>
            <ion-list lines="none" class="pdb-list">
              <ion-item class="pdb-item pdb-item--textarea">
                <ion-textarea
                  v-model="paymentNote"
                  :rows="3"
                  placeholder="Any remarks or payment notes..."
                  auto-grow
                />
              </ion-item>
            </ion-list>
          </div>

          <!-- Proof upload -->
          <div class="pdb-section">
            <p class="pdb-section-label">Payment proof</p>
            <div class="pdb-proof-row" @click="triggerProofInput">
              <div class="pdb-proof-left">
                <div class="pdb-item-icon pdb-icon-proof">
                  <Icon icon="lucide:image-plus" />
                </div>
                <div>
                  <p class="pdb-proof-title">Upload screenshot</p>
                  <p class="pdb-proof-sub">{{ proofImages.length > 0 ? `${proofImages.length} image(s) uploaded` : 'No image yet' }}</p>
                </div>
              </div>
              <ion-badge :color="proofImages.length > 0 ? 'success' : 'medium'" class="pdb-proof-badge">
                {{ proofImages.length > 0 ? 'Done' : 'Add' }}
              </ion-badge>
            </div>
            <div v-if="proofImages.length" class="pdb-proof-thumbs">
              <div
                v-for="(img, i) in proofImages"
                :key="i"
                class="pdb-thumb"
                @click.stop="openGallery(mediaUrl(img.url))"
              >
                <img :src="mediaUrl(img.url)" :alt="`Proof ${i + 1}`" />
              </div>
            </div>
          </div>

          <!-- Actions -->
          <div class="pdb-actions">
            <AppButton
              expand="block"
              size="lg"
              :loading="isUpdating"
              :disabled="!paymentStatus"
              icon="lucide:check-circle"
              @click="handleSavePaymentAndComplete"
            >
              Save & Complete order
            </AppButton>
            <AppButton variant="ghost" expand="block" @click="showPaymentModal = false">
              Cancel
            </AppButton>
          </div>

        </div>
      </ion-content>
    </ion-modal>

    <!-- Reusable Ride Selection Modal -->
    <RideSelectorModal
      v-model:is-open="showRideModal"
      :order-id="String(order?._id || order?.id || '')"
      :customer-name="order?.customer?.full_name || 'Customer'"
      :destination="{ 
        lat: order?.delivery_address?.latitude ? Number(order.delivery_address.latitude) : Number(order?.address?.latitude || 0),
        lng: order?.delivery_address?.longitude ? Number(order.delivery_address.longitude) : Number(order?.address?.longitude || 0)
      }"
      @booked="(p: string) => showSuccess(`Ride booked via ${p}`)"
    />

    <!-- Image Gallery Modal -->
    <ion-modal :is-open="showGallery" @didDismiss="showGallery = false" class="gallery-modal">
      <div class="gallery-container">
        <div class="gallery-header">
          <AppButton variant="clear" icon-only icon="lucide:x" @click="showGallery = false" class="close-btn" />
        </div>
        <div class="gallery-content">
          <img :src="activeImageUrl" class="full-image" alt="Preview" />
        </div>
      </div>
    </ion-modal>
  </ion-page>
</template>

<script setup lang="ts">
import { alertController, toastController } from '@ionic/vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '@/shared/composables'
import { useNavigation } from '@/shared/composables/useNavigation'
import { formatISTDate, formatISTDateShort, getTodayIST } from '@/shared/lib/datetime'
import type { OrderProduct, PaymentStatus } from '@/shared/models'
import { mediaUrl } from '@/shared/lib/media'
import { useOrderDetail } from '../composables/useOrderDetail'

const route = useRoute()
const router = useRouter()
const orderId = route.params.id as string

const {
  order,
  isLoading,
  isUpdating,
  isVerifyingOtp,
  error,
  nextActionLabel,
  isCompleted,
  canUpgrade,
  fetchOrder,
  advanceStatus,
  uploadSelfie,
  uploadCompletionProof,
  uploadSetupPhotos,
  cancelAfterArrival,
  upgradeProduct,
  getUpgradableProducts,
  captureAndUploadPaymentProof,
  captureAndUploadSetupPhoto,
  updateOrderDetails,
  generateOtp,
} = useOrderDetail()

// ── UI State ───────────────────────────────────────────────────────────────

const { showSuccess, showError } = useToast()
const showRideModal = ref(false)
const showGallery = ref(false)
const activeImageUrl = ref('')
const showOtpInput = ref(false)
const otpValue = ref('')
const showCancelModal = ref(false)
const cancelReason = ref('')
const showUpgradeModal = ref(false)
const isFetchingUpgrades = ref(false)
const selectedItem = ref<OrderProduct | null>(null)
const upgradableProducts = ref<any[]>([])
const setupInput = ref<HTMLInputElement | null>(null)
const proofInput = ref<HTMLInputElement | null>(null)
const paymentStatus = ref<PaymentStatus | ''>('')
const showPaymentModal = ref(false)
const paymentCodAmount = ref<number | null>(null)
const paymentUpiAmount = ref<number | null>(null)
const paymentTipAmount = ref<number | null>(null)
const paymentReferenceInput = ref('')
const paymentNote = ref('')
const paymentStatusOptions = [
  { label: 'Paid', value: 'paid' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Conflict', value: 'conflict' },
]
const { openNavigationMenu } = useNavigation()

// ── Computed ───────────────────────────────────────────────────────────────

const customerInitials = computed(() => {
  const name = order.value?.customer?.full_name || order.value?.customer?.name || '?'
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
})

const formattedDate = computed(() => {
  const d = order.value?.booking_info?.date ?? order.value?.service_date ?? order.value?.created_at
  if (!d) return '...'
  return formatISTDate(d)
})

const fullAddress = computed(() => {
  if (!order.value) return '...'
  const addr = order.value.delivery_address || order.value.address
  if (!addr) return 'No address provided'
  return [addr.street || addr.line1, addr.landmark, addr.city, addr.pincode]
    .filter(Boolean)
    .join(', ')
})

const hasOrderContext = computed(() => {
  return !!(
    order.value?.notes ||
    order.value?.custom_instruction ||
    order.value?.staff_notes ||
    order.value?.payment?.internal_comment ||
    order.value?.instruction_presets?.length
  )
})

const isCustomerHidden = computed(() => {
  const status = order.value?.status?.toLowerCase() || ''
  const hiddenStatuses = ['completed', 'cancelled', 'cancel_requested', 'arrived_and_cancelled']
  const missingCustomer =
    !order.value?.customer?.full_name &&
    !order.value?.customer?.name &&
    !order.value?.customer?.phone

  return hiddenStatuses.includes(status) || missingCustomer
})

const statusVariant = computed(() => {
  const s = order.value?.status?.toLowerCase()
  if (s === 'completed') return 'success'
  if (s === 'ongoing' || s === 'started' || s === 'confirmed' || s === 'reached_customer_place')
    return 'brand'
  if (s === 'arrived_and_cancelled' || s === 'cancel_requested') return 'danger'
  return 'neutral'
})

const orderStatusLabel = computed(() => {
  const status = order.value?.status?.toLowerCase() || ''
  switch (status) {
    case 'cancel_requested':
      return 'Cancellation Requested'
    case 'reached_customer_place':
      return 'Reached Customer Place'
    case 'arrived_and_cancelled':
      return 'Arrived & Cancelled'
    case 'cancelled':
      return 'Cancelled'
    case 'completed':
      return 'Completed'
    case 'started':
      return 'Started'
    case 'ongoing':
      return 'Ongoing'
    case 'confirmed':
      return 'Confirmed'
    default:
      return order.value?.status ?? 'Unknown'
  }
})

const paymentStatusVariant = computed(() => {
  const s = order.value?.payment?.status?.toLowerCase() ?? ''
  return s === 'paid' ? 'success' : 'warning'
})

const amountPaid = computed(() => {
  if (!order.value) return '—'
  if (order.value.payment?.amount_paid != null) return `₹${order.value.payment.amount_paid}`
  if (order.value.cod_collected_amount != null) return `₹${order.value.cod_collected_amount}`
  if (order.value.total != null) return `₹${order.value.total}`
  return '—'
})

const tipAmount = computed(() => {
  const tip = order.value?.payment?.tip ?? order.value?.tip
  if (tip != null) return `₹${tip}`
  return '—'
})

const paymentReference = computed(() => order.value?.payment?.reference || '—')

/** Parses old remark-based breakdown for backward compat: "COD ₹500 | UPI ₹0 | Tip ₹50" */
const parsedPaymentRemark = computed(() => {
  const remark = order.value?.payment?.remark
  if (!remark) return null
  const codMatch = remark.match(/COD ₹(\d+(?:\.\d+)?)/)
  const upiMatch = remark.match(/UPI ₹(\d+(?:\.\d+)?)/)
  const tipMatch = remark.match(/Tip ₹(\d+(?:\.\d+)?)/)
  if (!codMatch && !upiMatch && !tipMatch) return null
  return {
    cod: codMatch ? parseFloat(codMatch[1]) : null,
    upi: upiMatch ? parseFloat(upiMatch[1]) : null,
    tip: tipMatch ? parseFloat(tipMatch[1]) : null,
  }
})

const paymentTotalCollected = computed(() => {
  const cod = Number(paymentCodAmount.value ?? 0)
  const upi = Number(paymentUpiAmount.value ?? 0)
  const tip = Number(paymentTipAmount.value ?? 0)
  return cod + upi + tip
})

const canCancel = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return s === 'confirmed' || s === 'ongoing' || s === 'reached_customer_place' || s === 'started'
})

const isSelfieStep = computed(() => {
  const s = order.value?.status?.toLowerCase()
  return (s === 'ongoing' || s === 'reached_customer_place') && !order.value?.arrival_selfie
})

const setupPhotos = computed(() => {
  if (!order.value?.setup_photos) return []
  return Array.isArray(order.value.setup_photos)
    ? order.value.setup_photos.filter((p: { url?: string }) => !!p?.url)
    : order.value.setup_photos
      ? [order.value.setup_photos]
      : []
})

const proofImages = computed(() => {
  if (!order.value?.proof_of_service) return []
  return Array.isArray(order.value.proof_of_service)
    ? order.value.proof_of_service.filter((p: { url?: string }) => !!p?.url)
    : order.value.proof_of_service
      ? [order.value.proof_of_service]
      : []
})

const assignedTrip = computed(() => {
  if (!order.value?.trips?.length) return null
  return order.value.trips[0]
})

const showAssignedTripInfo = computed(() => {
  if (!assignedTrip.value || !order.value) return false
  const status = order.value.status?.toLowerCase() || ''
  return !['completed', 'cancelled', 'arrived_and_cancelled'].includes(status)
})

const isBookingDateToday = computed(() => {
  if (!order.value?.booking_info?.date) return false
  return formatISTDateShort(order.value.booking_info.date) === getTodayIST()
})

const bookingDateStatus = computed(() => {
  if (!order.value?.booking_info?.date) return 'unknown'
  const bookingDate = formatISTDateShort(order.value.booking_info.date)
  const today = getTodayIST()
  if (bookingDate === today) return 'today'
  return bookingDate > today ? 'future' : 'past'
})

const isBookingDateFuture = computed(() => bookingDateStatus.value === 'future')

const bookingDateRestrictionMessage = computed(() => {
  if (!order.value?.booking_info?.date) return ''
  const formatted = formatISTDate(order.value.booking_info.date)
  if (bookingDateStatus.value === 'future') {
    return `This order is scheduled for ${formatted}. Status changes are only allowed on the scheduled date.`
  }
  return ''
})

watch(
  order,
  value => {
    const status = value?.payment?.status?.toLowerCase() ?? ''
    const allowedStatuses = ['pending', 'paid', 'unpaid', 'conflict', 'failed', 'refunded'] as const
    paymentStatus.value = allowedStatuses.includes(status as any) ? (status as PaymentStatus) : ''
  },

  { immediate: true }
)

// ── Methods ────────────────────────────────────────────────────────────────

async function handleRefresh(event?: CustomEvent): Promise<void> {
  await fetchOrder(orderId)
  if (event?.target && typeof (event.target as HTMLIonRefresherElement).complete === 'function') {
    ;(event.target as HTMLIonRefresherElement).complete()
  }
}

async function presentConfirm(header: string, message: string) {
  const alert = await alertController.create({
    header,
    message,
    mode: 'ios',
    buttons: [
      { text: 'No', role: 'cancel' },
      { text: 'Yes', role: 'confirm' },
    ],
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  return role === 'confirm'
}

async function promptSetupPhotoUpload(): Promise<void> {
  const alert = await alertController.create({
    header: 'Upload Setup Photos',
    message: 'Choose whether to take a photo or upload existing setup images.',
    mode: 'ios',
    buttons: [
      { text: 'Cancel', role: 'cancel' },
      { text: 'Upload from Gallery', handler: triggerSetupInput },
      { text: 'Take Photo', handler: handleCaptureSetupPhoto },
    ],
  })
  await alert.present()
}

async function handleMainAction() {
  const s = order.value?.status?.toLowerCase()

  if (s === 'confirmed') {
    // Confirmed -> Ongoing (Start travel)
    const confirmed = await presentConfirm(
      'Start travel',
      'Are you sure you want to start moving to the customer location?'
    )
    if (!confirmed) return
    await advanceStatus()
  } else if (s === 'ongoing') {
    // Ongoing -> Reached Customer Place
    const confirmed = await presentConfirm(
      'Reached Customer Place',
      'Have you reached the customer location and want to begin arrival verification?'
    )
    if (!confirmed) return
    await advanceStatus()
  } else if (s === 'reached_customer_place') {
    if (!order.value?.arrival_selfie) {
      const confirmed = await presentConfirm(
        'Take Selfie',
        'Are you ready to take the arrival selfie and upload setup photos?'
      )
      if (!confirmed) return

      await handleUploadSelfie()
    } else if (setupPhotos.value.length === 0) {
      await promptSetupPhotoUpload()
    } else {
      if (!order.value?.verification?.otp_sent_at) {
        const otp = await generateOtp()
        if (otp) {
          const toast = await toastController.create({
            message: 'Service OTP generated. Ask the customer for the code.',
            duration: 2500,
            color: 'success',
            position: 'top',
          })
          await toast.present()
        }
      }
      showOtpInput.value = true
    }
  } else if (s === 'started') {
    openPaymentModal()
  } else {
    // Started -> Completed (Complete Service)
    const confirmed = await presentConfirm(
      'Complete Service',
      'Have you finished all services? This will mark the order as completed.'
    )
    if (!confirmed) return
    await advanceStatus()
  }
}

async function handleUploadSelfie() {
  const uploaded = await uploadSelfie()
  if (uploaded) {
    showSuccess('Selfie uploaded successfully')
    if (order.value?.status.toLowerCase() === 'reached_customer_place') {
      if (setupPhotos.value.length === 0) {
        const toast = await toastController.create({
          message: 'Now upload setup photos using camera or gallery.',
          duration: 2500,
          color: 'warning',
          position: 'top',
        })
        await toast.present()
      } else {
        showOtpInput.value = true
      }
    }
  }
}

async function handleSavePaymentStatus() {
  if (!order.value) return
  if (!paymentStatus.value || !['paid', 'unpaid', 'conflict'].includes(paymentStatus.value)) {
    showError('Please choose Paid, Unpaid, or Conflict before saving payment status.')
    return
  }

  await updateOrderDetails({ payment: { status: paymentStatus.value as PaymentStatus } })
  if (!error.value) {
    showSuccess('Payment status updated successfully')
  }
}

function triggerProofInput() {
  proofInput.value?.click()
}

async function handleCaptureSetupPhoto() {
  const uploaded = await captureAndUploadSetupPhoto()
  if (uploaded) {
    showSuccess('Setup photo uploaded successfully')
  }
}

function triggerSetupInput() {
  setupInput.value?.click()
}

async function handleSetupPhotosChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  const uploaded = await uploadSetupPhotos(files)
  if (uploaded) {
    showSuccess('Setup photos uploaded successfully')
  }
  if (setupInput.value) {
    setupInput.value.value = ''
  }
}

async function handleCapturePaymentProof() {
  const uploaded = await captureAndUploadPaymentProof()
  if (uploaded) {
    showSuccess('Payment proof captured successfully')
  }
}

async function handleVerifyOtp() {
  if (otpValue.value.length !== 6) return

  const confirmed = await presentConfirm(
    'Verify OTP',
    'Are you sure you want to verify the OTP and start the service?'
  )
  if (!confirmed) return

  // Requirement: Transition to 'started' using OTP
  // We use advanceStatus here because it calls the status update endpoint which handles OTP verification and state transition in one go.
  await advanceStatus(undefined, otpValue.value)
  if (!error.value) {
    showOtpInput.value = false
    otpValue.value = ''
    const toast = await toastController.create({
      message: 'Service started successfully!',
      duration: 2000,
      color: 'success',
      position: 'top',
    })
    await toast.present()
  }
}

function openGallery(url: string) {
  activeImageUrl.value = url
  showGallery.value = true
}

function getSelectedServiceItems(item: Readonly<OrderProduct>) {
  return (
    item.selected_package_items || (item as any).services || (item as any).package_services || []
  )
}

function getSelectedOptions(item: Readonly<OrderProduct>) {
  return item.selected_options || (item as any).options || []
}

function getSelectedFreeItems(item: Readonly<OrderProduct>) {
  return item.selected_free_items || (item as any).free_products || []
}

function openCancelModal() {
  showCancelModal.value = true
  otpValue.value = ''
}

function openPaymentModal() {
  paymentStatus.value = (order.value?.payment?.status?.toLowerCase() ?? '') as PaymentStatus
  paymentCodAmount.value = order.value?.payment?.cod_amount ?? null
  paymentUpiAmount.value = order.value?.payment?.upi_amount ?? null
  paymentReferenceInput.value = order.value?.payment?.reference || ''
  paymentTipAmount.value = order.value?.payment?.tip ?? null
  paymentNote.value = order.value?.payment?.remark || ''
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
}

async function handleSavePaymentAndComplete() {
  if (!order.value) return
  if (!paymentStatus.value || !['paid', 'unpaid', 'conflict'].includes(paymentStatus.value)) {
    showError('Please choose Paid, Unpaid, or Conflict before completing the service.')
    return
  }

  if (!proofImages.value.length) {
    showError('Please upload payment proof before completing the service.')
    return
  }

  const codAmount = Number(paymentCodAmount.value ?? 0)
  const upiAmount = Number(paymentUpiAmount.value ?? 0)
  const tipAmount = Number(paymentTipAmount.value ?? 0)

  if (codAmount < 0 || upiAmount < 0 || tipAmount < 0) {
    showError('Amount values cannot be negative.')
    return
  }

  const methodParts: string[] = []
  if (codAmount > 0) methodParts.push('COD')
  if (upiAmount > 0) methodParts.push('UPI')

  const paymentPayload = {
    status: paymentStatus.value,
    method: methodParts.length > 0 ? methodParts.join('+') : undefined,
    amount_paid: codAmount + upiAmount + tipAmount,
    cod_amount: codAmount || undefined,
    upi_amount: upiAmount || undefined,
    tip: tipAmount || undefined,
    remark: paymentNote.value.trim() || undefined,
    reference: paymentReferenceInput.value.trim() || undefined,
  }

  await updateOrderDetails({ payment: paymentPayload })
  if (error.value) return

  showPaymentModal.value = false
  await advanceStatus()
  if (!error.value) {
    showSuccess('Payment details saved and service completed successfully.')
  }
}

async function handleCompletionProofChange(event: Event) {
  const target = event.target as HTMLInputElement
  const files = target.files
  if (!files || files.length === 0) return

  const uploaded = await uploadCompletionProof(files)
  if (uploaded) {
    showSuccess('Payment proof uploaded successfully')
  }
  if (proofInput.value) {
    proofInput.value.value = ''
  }
}

async function handleCancel() {
  if (!cancelReason.value.trim()) {
    const toast = await toastController.create({
      message: 'Please provide a reason for cancellation.',
      duration: 2000,
      color: 'warning',
    })
    await toast.present()
    return
  }

  // API Trigger
  await cancelAfterArrival(cancelReason.value)

  if (!error.value) {
    showCancelModal.value = false
    cancelReason.value = ''
    otpValue.value = ''
    const toast = await toastController.create({
      message: 'Cancellation request submitted',
      duration: 2000,
      color: 'success',
      position: 'top',
    })
    await toast.present()
  }
}

async function openUpgradeModal(item: OrderProduct) {
  selectedItem.value = item
  showUpgradeModal.value = true
  isFetchingUpgrades.value = true
  try {
    const prods = await getUpgradableProducts(item.product_id)
    upgradableProducts.value = prods
  } catch (err) {
    console.error('Failed to fetch upgrades', err)
  } finally {
    isFetchingUpgrades.value = false
  }
}

async function handleUpgrade(newProduct: any) {
  if (!selectedItem.value || !order.value) return

  await upgradeProduct({
    order_product_id: selectedItem.value.order_product_id || '',
    new_product_id: String(newProduct._id || newProduct.id),
  })

  showUpgradeModal.value = false
  if (!error.value) {
    const toast = await toastController.create({
      message: `${newProduct.title || newProduct.name} added to order!`,
      duration: 2000,
      color: 'success',
      position: 'top',
    })
    await toast.present()
  }
}

async function navigateToLocation() {
  if (!order.value) return
  const addr = order.value.delivery_address || order.value.address
  if (!addr || !addr.latitude || !addr.longitude) {
    showError('Coordinates not available for this address.')
    return
  }
  await openNavigationMenu(
    Number(addr.latitude),
    Number(addr.longitude),
    order.value.customer?.full_name || 'Customer'
  )
}

async function copyAddress() {
  if (!fullAddress.value) return

  const text = fullAddress.value
  try {
    // 1. Try modern API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      showSuccess('Address copied to clipboard')
      return
    }

    // 2. Fallback for non-secure / older mobile contexts
    const textArea = document.createElement('textarea')
    textArea.value = text
    textArea.style.position = 'fixed'
    textArea.style.left = '-9999px'
    textArea.style.top = '0'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()

    const successful = document.execCommand('copy')
    document.body.removeChild(textArea)

    if (successful) {
      showSuccess('Address copied')
    } else {
      throw new Error('Fallback copy failed')
    }
  } catch (err) {
    console.error('Copy failed', err)
    showError('Failed to copy address')
  }
}

onMounted(() => fetchOrder(orderId))
</script>

<style scoped>
/* ── Layout & Sections ───────────────────────────────────────────────────── */

.loading-state, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 80vh;
  padding: 40px;
  text-align: center;
  color: var(--color-text-muted);
}

.error-icon { font-size: 48px; color: var(--color-danger); margin-bottom: 16px; }

.order-hero {
  background: linear-gradient(165deg, var(--color-brand) 0%, var(--color-brand-mid) 100%);
  color: white;
  padding: var(--spacing-3) var(--spacing-4) var(--spacing-5);
  border-bottom-left-radius: var(--radius-2xl);
  border-bottom-right-radius: var(--radius-2xl);
  box-shadow: 0 12px 32px rgba(124, 58, 237, 0.25);
  position: relative;
  overflow: hidden;
}

.order-hero::before {
  content: '';
  position: absolute;
  top: -20%;
  right: -10%;
  width: 240px;
  height: 240px;
  background: radial-gradient(circle, rgba(255,255,255,0.15) 0%, transparent 70%);
  pointer-events: none;
}

.hero-content {
  position: relative;
  z-index: 1;
}

.customer-compact {
  margin-bottom: var(--spacing-3);
}

.compact-top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--spacing-1);
}

.customer-name-compact {
  margin: 0 0 var(--spacing-2);
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: white;
}

.compact-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.compact-detail-row {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: var(--font-size-sm);
  color: rgba(255, 255, 255, 0.85);
  font-weight: 500;
  line-height: 1.4;
}

.compact-icon {
  font-size: 14px;
  opacity: 0.75;
  flex-shrink: 0;
  margin-top: 2px;
}

.masked-hero {
  background: rgba(255, 255, 255, 0.08);
  border-radius: var(--radius-xl);
  padding: var(--spacing-3);
  margin-bottom: var(--spacing-3);
}

.masked-hero-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.masked-hero-label {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.65rem;
}

.masked-hero-number {
  margin: 0.2rem 0 0;
  font-size: 1.05rem;
  line-height: 1.2;
  color: white;
}

.masked-hero-grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  margin-top: var(--spacing-2);
}

.status-badge-hero {
  --background: rgba(255, 255, 255, 0.18);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.22);
  color: white;
  padding: 6px 10px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}

.main-hero-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  margin-bottom: 10px;
}

.dual-btns-modern {
  display: flex;
  gap: 8px;
}

.masked-meta-item {
  background: rgba(255, 255, 255, 0.12);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
}

.masked-meta-item .meta-label {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 0.8rem;
}

.masked-meta-item .meta-value {
  margin: 0.35rem 0 0;
  color: white;
  font-weight: 700;
}

.order-id-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 10px;
  border-radius: var(--radius-full);
  margin-top: 4px;
  font-size: var(--font-size-xs);
  font-weight: 700;
  backdrop-filter: blur(4px);
}

.hash-icon {
  font-size: 10px;
  opacity: 0.7;
}

.status-badge-hero {
  --background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.meta-label {
  margin: 0;
  font-size: var(--font-size-xs);
  font-weight: 700;
  text-transform: uppercase;
  opacity: 0.6;
}

.meta-value {
  margin: 0;
  font-size: var(--font-size-sm);
  font-weight: 600;
}

.main-hero-btns {
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 12px;
  margin-bottom: 12px;
}

.nav-btn-modern, .ride-btn-modern {
  --background: white;
  --color: var(--color-brand);
  --box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  font-weight: 800;
}

.dual-btns-modern {
  display: flex;
  gap: 12px;
}

.action-chip {
  --background: white;
  --color: var(--color-brand);
  --box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  --border-radius: var(--radius-lg);
  flex: 1;
  font-weight: 800;
}

.payment-status-row {
  display: flex;
  gap: var(--spacing-3);
  align-items: center;
  flex-wrap: wrap;
}

.context-grid {
  display: grid;
  gap: var(--spacing-3);
  margin-top: var(--spacing-3);
}

.context-box {
  padding: var(--spacing-4);
  border-radius: var(--radius-xl);
  background: var(--color-background);
  border: 1px solid var(--color-border);
}

.box-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  margin-bottom: var(--spacing-2);
  font-size: var(--font-size-xs);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.box-header svg {
  width: 14px;
  height: 14px;
  color: var(--color-brand);
}

.context-box p {
  margin: 0;
  font-size: var(--font-size-sm);
  line-height: 1.5;
  color: var(--color-text);
  font-weight: 500;
}

.preset-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}

.note-box {
  background: var(--color-brand-pale);
  border-color: rgba(var(--color-brand-rgb), 0.1);
}

.instruction-box {
  background: #fffbe6;
  border-color: #ffe58f;
}

.internal-box {
  background: var(--color-surface);
  border-style: dashed;
}

.mb-2 { margin-bottom: 8px; }
.mt-1 { margin-top: 4px; }

.form-select {
  flex: 1;
  min-width: 160px;
  padding: 12px 14px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  font-size: var(--font-size-sm);
}

.payment-status-editor .hint {
  margin-top: var(--spacing-3);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

.payment-details-grid {
  display: grid;
  gap: var(--spacing-3);
  margin-top: var(--spacing-4);
}

.payment-detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-3) var(--spacing-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.payment-detail-item span {
  color: var(--color-text-muted);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  font-weight: 700;
}

.payment-detail-item strong {
  color: var(--color-text);
  font-size: var(--font-size-sm);
  font-weight: 700;
}

.payment-detail-item.full-width {
  grid-column: span 2;
}

.primary-action-btn-custom {
  --background: var(--color-brand);
  --box-shadow: 0 8px 24px rgba(124, 58, 237, 0.3);
  font-weight: 800;
}

.order-content { 
  padding: var(--spacing-5); 
  display: flex; 
  flex-direction: column; 
  gap: var(--spacing-5); 
}

.line-items { 
  display: flex; 
  flex-direction: column; 
  gap: var(--spacing-3); 
  margin-bottom: var(--spacing-6); 
}

.modern-item-card {
  background: var(--color-background);
  border-radius: var(--radius-xl);
  padding: var(--spacing-4);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.mic-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.mic-title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.mic-title {
  font-weight: 600;
  font-size: 1.05rem;
  color: var(--ion-color-step-900, #1a1a1a);
  line-height: 1.3;
}

.mic-badges {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}

.mic-meta {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.9rem;
  color: var(--ion-color-step-600, #666);
}

.mic-total {
  font-weight: 700;
  color: var(--ion-color-primary);
  font-size: 1rem;
}

.mic-attributes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 2px;
}

.mic-attr {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.8rem;
  color: var(--ion-color-step-500, #888);
}

.mic-icon {
  font-size: 14px;
}

.mic-sub-section {
  border-top: 1px dashed var(--ion-color-step-200, #d0d0d0);
  padding-top: 8px;
}

.mic-sub-header {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ion-color-step-400, #aaa);
  margin-bottom: 6px;
}

.mic-sub-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.mic-sub-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--ion-color-step-700, #444);
}

.mic-sub-icon {
  font-size: 14px;
  margin-top: 2px;
}

.mic-item-row {
  justify-content: space-between;
  align-items: center;
}

.mic-item-info {
  display: flex;
  flex-direction: column;
}

.mic-item-title {
  font-weight: 500;
}

.mic-item-meta {
  font-size: 0.75rem;
  color: var(--ion-color-step-500, #888);
}

.mic-item-price {
  font-weight: 600;
  font-size: 0.85rem;
}

.mic-actions {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}

.order-summary-footer {
  padding-top: 16px;
  border-top: 2px solid var(--color-background);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modern-summary-card {
  padding: 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,255,0.95) 100%);
  box-shadow: 0 20px 40px rgba(14, 30, 77, 0.08);
  border: 1px solid rgba(51, 65, 85, 0.08);
}

.summary-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-label {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  color: var(--color-text);
  text-transform: uppercase;
}

.summary-subtitle {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.summary-status {
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.summary-status.paid {
  color: var(--color-success);
  background: rgba(var(--color-success-rgb), 0.12);
}

.summary-status.pending {
  color: var(--color-warning);
  background: rgba(var(--color-warning-rgb), 0.14);
}

.summary-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.summary-item,
.summary-total {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(15, 23, 42, 0.05);
}

.summary-item span,
.summary-total span {
  color: var(--color-text-muted);
  font-size: 0.85rem;
}

.summary-item strong,
.summary-total strong {
  color: var(--color-text);
  font-size: 1rem;
  font-weight: 700;
}

.summary-total {
  grid-column: span 2;
  background: linear-gradient(90deg, rgba(99,102,241,0.12), rgba(16,185,129,0.12));
  border-color: rgba(99,102,241,0.18);
}

.summary-total strong {
  font-size: 1.2rem;
}

.content-card {
  background: var(--color-surface);
  border-radius: var(--radius-2xl);
  padding: var(--spacing-5);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
  border: 1px solid var(--color-border);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: var(--spacing-4);
}

.card-header h3 {
  margin: 0;
  font-size: var(--font-size-md);
  font-weight: 800;
  color: var(--color-text);
  letter-spacing: -0.01em;
}

.card-header .header-icon {
  font-size: 20px;
  color: var(--color-brand);
}

.trip-info-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.trip-info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px;
  background: rgba(99, 102, 241, 0.04);
  border-radius: var(--radius-xl);
}

.trip-info-row span {
  font-size: 0.78rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.trip-info-row strong {
  font-size: 1rem;
  color: var(--color-text);
  line-height: 1.4;
}

.address-text {
  margin: 0;
  font-size: var(--font-size-base);
  color: var(--color-text-secondary);
  line-height: 1.6;
  font-weight: 500;
}

.action-footer {
  position: sticky;
  bottom: 0;
  padding: var(--spacing-5) var(--spacing-5) max(var(--spacing-5), env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: var(--spacing-3);
}

.cancel-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.form-label-group {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.form-label-group svg {
  color: var(--color-brand);
  font-size: 14px;
}

.modern-textarea {
  width: 100%;
  padding: 16px;
  border-radius: 16px;
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  font-family: inherit;
  font-size: 14px;
  resize: none;
  transition: border-color 0.2s ease;
}

.modern-textarea:focus {
  outline: none;
  border-color: var(--color-brand);
}

.otp-wrapper-modern {
  display: flex;
  justify-content: center;
  margin-top: 16px;
  padding: 20px;
  background: var(--color-background);
  border-radius: 20px;
  border: 1px dashed var(--color-border);
}

/* ── Cancel Modal Styling ─────────────────────────────────────────────────── */

.cancel-modal { --border-radius: 28px 28px 0 0; }

.cancel-container { padding: 8px 4px 24px; display: flex; flex-direction: column; gap: 28px; }

.cancel-warning { text-align: center; }
.warning-icon-wrapper { 
  width: 56px; height: 56px; border-radius: 18px; background: var(--color-danger-pale); 
  color: var(--color-danger); display: flex; align-items: center; justify-content: center; 
  margin: 0 auto 16px; font-size: 28px; 
}
.cancel-warning h3 { margin: 0; font-size: 20px; font-weight: 800; color: var(--color-text); }
.cancel-warning p { margin: 8px 0 0; font-size: 14px; color: var(--color-text-muted); line-height: 1.5; }

.cancel-form-section { display: flex; flex-direction: column; gap: 8px; }
.form-label { font-size: 14px; font-weight: 700; color: var(--color-text); }
.form-hint { margin: 0; font-size: 13px; color: var(--color-text-muted); }

.cancel-textarea { 
  --padding-start: 16px; --padding-end: 16px; --padding-top: 16px; --padding-bottom: 16px;
  --border-radius: 16px; --border-color: var(--color-border); font-size: 15px;
}

.otp-wrapper { margin-top: 8px; }

.cancel-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }

/* ── Modals & Helpers ────────────────────────────────────────────────────── */
.otp-modal { --border-radius: 32px 32px 0 0; }
.otp-drawer-content { padding: 32px 24px; display: flex; flex-direction: column; gap: 32px; }
.otp-icon-wrapper { 
  width: 64px; height: 64px; border-radius: 20px; background: var(--color-brand-pale); 
  color: var(--color-brand); display: flex; align-items: center; justify-content: center; 
  margin: 0 auto; font-size: 32px; 
}
.otp-header { text-align: center; }
.otp-header h3 { margin: 16px 0 8px; font-size: 22px; font-weight: 800; color: var(--color-text); }
.otp-header p { margin: 0; font-size: 14px; color: var(--color-text-muted); line-height: 1.5; }
.otp-input-section { display: flex; justify-content: center; }
.otp-footer { display: flex; flex-direction: column; gap: 12px; }

.upgrade-modal { --height: 70%; --border-radius: 24px 24px 0 0; }

.modal-loading, .modal-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
}

.upgrade-list { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.upgrade-option {
  display: flex;
  align-items: center;
  padding: 16px;
  background: var(--color-surface);
  border-radius: 16px;
  border: 1px solid var(--color-border);
}
.upgrade-option:active { background: var(--color-background); }
.upgrade-option__info { flex: 1; }
.upgrade-option__info h4 { margin: 0; font-size: 16px; font-weight: 700; }
.upgrade-option__info p { margin: 4px 0 8px; font-size: 13px; color: var(--color-text-muted); }
.price-diff { font-size: 12px; font-weight: 700; color: var(--color-success); background: var(--color-success-pale); padding: 4px 8px; border-radius: 6px; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
.ms-auto { margin-left: auto; }

.proof-group {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.proof-entry {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.proof-label {
  margin: 0;
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.proof-preview, .proof-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.proof-preview img, .proof-thumbnail img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 12px;
  border: 1px solid var(--color-border);
  box-shadow: 0 2px 6px rgba(0,0,0,0.05);
}

.proof-empty {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-muted);
  font-style: italic;
}

.proof-preview, .proof-thumbnail {
  cursor: pointer;
  transition: transform 0.2s ease, opacity 0.2s ease;
}

.proof-preview:active, .proof-thumbnail:active {
  transform: scale(0.95);
  opacity: 0.8;
}

/* ── Gallery Modal Styling ────────────────────────────────────────────────── */
.gallery-modal {
  --background: rgba(0, 0, 0, 0.95);
  --width: 100%;
  --height: 100%;
}

/* ── Payment Details Modal ───────────────────────────────────────────────── */
.payment-modal { --border-radius: 28px 28px 0 0; }

.payment-modal-toolbar {
  --background: transparent;
}

.payment-modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 800;
  color: var(--color-text);
}

.payment-modal-title-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: var(--color-brand-pale);
  color: var(--color-brand);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
}

.payment-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding-bottom: max(24px, env(safe-area-inset-bottom));
}

.pdb-bill-banner {
  background: linear-gradient(135deg, var(--color-brand) 0%, color-mix(in srgb, var(--color-brand) 80%, #000) 100%);
  border-radius: 20px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  color: #fff;
}

.pdb-bill-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pdb-bill-row--sub {
  font-size: 13px;
  opacity: 0.75;
}

.pdb-bill-label {
  font-size: 14px;
  font-weight: 600;
  opacity: 0.9;
}

.pdb-bill-amount {
  font-size: 30px;
  font-weight: 900;
  letter-spacing: -0.5px;
}

.pdb-bill-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.2);
  margin: 2px 0;
}

.pdb-section { display: flex; flex-direction: column; gap: 10px; }

.pdb-section-label {
  margin: 0;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--color-text-muted);
  padding-left: 4px;
}

.pdb-optional {
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-muted);
  opacity: 0.7;
}

.pdb-list {
  background: var(--color-surface);
  border-radius: 18px;
  overflow: hidden;
  --ion-item-background: transparent;
  --ion-item-border-color: var(--color-border);
  padding: 0;
}

.pdb-item {
  --padding-start: 12px;
  --padding-end: 12px;
  --inner-padding-end: 0;
  --min-height: 56px;
  --border-color: var(--color-border);
  font-size: 15px;
}

.pdb-item--textarea {
  --min-height: auto;
  align-items: flex-start;
  padding-top: 12px;
}

.pdb-item-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  margin-right: 12px;
  flex-shrink: 0;
}

.pdb-icon-cash  { background: #e8f5e9; color: #2e7d32; }
.pdb-icon-upi   { background: #e3f2fd; color: #1565c0; }
.pdb-icon-tip   { background: #fce4ec; color: #c62828; }
.pdb-icon-ref   { background: var(--color-brand-pale); color: var(--color-brand); }
.pdb-icon-proof { background: #f3e5f5; color: #7b1fa2; }

.pdb-item-label {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.pdb-amount-input {
  text-align: right;
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text);
  max-width: 100px;
  --placeholder-color: var(--color-text-muted);
}

.pdb-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--color-brand);
  border-radius: 16px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}

.pdb-total strong {
  font-size: 22px;
  font-weight: 800;
}

.status-chip-row {
  display: flex;
  gap: 10px;
}

.status-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 14px 8px;
  border-radius: 16px;
  border: 2px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.18s ease;
}

.status-chip svg { font-size: 20px; }

.status-chip--paid   { border-color: transparent; background: var(--color-surface); }
.status-chip--unpaid { border-color: transparent; background: var(--color-surface); }
.status-chip--conflict { border-color: transparent; background: var(--color-surface); }

.status-chip--active.status-chip--paid    { border-color: var(--color-success); background: #e8f5e9; color: var(--color-success); }
.status-chip--active.status-chip--unpaid  { border-color: var(--color-warning, #f59e0b); background: #fffbeb; color: #b45309; }
.status-chip--active.status-chip--conflict { border-color: var(--color-danger); background: var(--color-danger-pale); color: var(--color-danger); }

.pdb-proof-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--color-surface);
  border-radius: 18px;
  cursor: pointer;
  transition: background 0.15s ease;
}

.pdb-proof-row:active { background: var(--color-background); }

.pdb-proof-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pdb-proof-title { margin: 0; font-size: 15px; font-weight: 600; color: var(--color-text); }
.pdb-proof-sub   { margin: 2px 0 0; font-size: 12px; color: var(--color-text-muted); }

.pdb-proof-badge {
  --border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
}

.pdb-proof-thumbs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  padding-left: 2px;
}

.pdb-thumb {
  width: 72px;
  height: 72px;
  border-radius: 14px;
  overflow: hidden;
  border: 2px solid var(--color-border);
  cursor: pointer;
  transition: transform 0.15s ease, opacity 0.15s ease;
}

.pdb-thumb:active { transform: scale(0.93); opacity: 0.8; }

.pdb-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.pdb-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-top: 4px;
}

.gallery-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.gallery-header {
  padding: env(safe-area-inset-top) 16px 16px;
  display: flex;
  justify-content: flex-end;
}

.close-btn {
  --color: #fff;
  --background: rgba(255, 255, 255, 0.1);
  --border-radius: 50%;
  width: 44px;
  height: 44px;
}

.gallery-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.full-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 8px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.text-success { color: var(--color-success); }
.text-brand { color: var(--color-brand); }
.text-danger { color: var(--color-danger); }

/* ── Animations ──────────────────────────────────────────────────────────── */
</style>
