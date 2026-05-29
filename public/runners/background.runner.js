/**
 * Background Runner Script — HomSwag Team App
 *
 * Executed by @capacitor/background-runner in a headless JS environment.
 * No access to the webview, Vue state, or ES module imports.
 * Available APIs: fetch, console, setTimeout/setInterval, CapacitorKV,
 * CapacitorNotifications, CapacitorDevice.
 *
 * Triggered by the OS ~every 15 minutes while the app is backgrounded.
 * Polls BFF /notifications for new unread items and schedules local
 * notifications using the pre-created Android notification channels
 * (homswag_orders, homswag_trips, homswag_general). Each channel uses the
 * device's default notification tone and vibration pattern.
 *
 * CapacitorKV keys used:
 *   backgroundAuthToken — Bearer token written by the app at login/restore
 *   bffApiUrl           — BFF base URL written by the app at boot
 *   lastSeenNotifIds    — JSON array of notification IDs already shown
 *
 * Notification types handled:
 *   order_assigned       → homswag_orders channel ("New Order Assigned")
 *   order_status_changed → homswag_orders channel ("Order Update")
 *   invoice_sent         → homswag_orders channel ("Invoice Sent")
 *   trip_assigned        → homswag_trips  channel ("New Trip Assigned")
 *   trip_status_changed  → homswag_trips  channel ("Trip Update")
 *   <other>              → homswag_general channel
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Strip HTML tags from a string so the native notification body is plain text.
 * The notification body may contain TipTap rich-text HTML from the admin panel.
 */
function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

function channelIdForType(type) {
  if (!type) return 'homswag_general';
  var t = type.toLowerCase();
  if (t.indexOf('ringtone_alert') !== -1) return 'homswag_ringtone';
  if (t.indexOf('order') !== -1 || t.indexOf('invoice') !== -1) return 'homswag_orders';
  if (t.indexOf('trip') !== -1) return 'homswag_trips';
  return 'homswag_general';
}

function fallbackTitleForType(type) {
  switch (type) {
    case 'order_assigned':       return 'New Order Assigned';
    case 'order_status_changed': return 'Order Update';
    case 'invoice_sent':         return 'Invoice Sent';
    case 'trip_assigned':        return 'New Trip Assigned';
    case 'trip_status_changed':  return 'Trip Update';
    default:                     return 'HomSwag';
  }
}

// ---------------------------------------------------------------------------
// notificationCheck — fired by the OS background task
// ---------------------------------------------------------------------------

addEventListener('notificationCheck', function(resolve, reject) {
  var tokenResult  = CapacitorKV.get('backgroundAuthToken');
  var apiUrlResult = CapacitorKV.get('bffApiUrl');

  var token  = tokenResult  ? tokenResult.value  : null;
  var apiUrl = apiUrlResult ? apiUrlResult.value : null;

  if (!token || !apiUrl) {
    console.log('[BackgroundRunner] No auth token or API URL — skipping');
    resolve();
    return;
  }

  var lastSeenResult = CapacitorKV.get('lastSeenNotifIds');
  var lastSeenIds = [];
  if (lastSeenResult && lastSeenResult.value) {
    try { lastSeenIds = JSON.parse(lastSeenResult.value); } catch (e) { lastSeenIds = []; }
  }

  fetch(apiUrl + '/notifications?is_read=false&limit=20', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
  })
    .then(function(response) {
      if (!response.ok) {
        console.warn('[BackgroundRunner] Fetch failed, status:', response.status);
        resolve();
        return null;
      }
      return response.json();
    })
    .then(function(body) {
      if (!body) return;

      // Normalise both flat array and paginated response shapes
      var notifications = [];
      var raw = body.data;
      if (Array.isArray(raw))             { notifications = raw; }
      else if (raw && Array.isArray(raw.items)) { notifications = raw.items; }
      else if (raw && Array.isArray(raw.data))  { notifications = raw.data; }

      var newItems = notifications.filter(function(n) {
        return lastSeenIds.indexOf(String(n.id)) === -1;
      });

      if (newItems.length === 0) {
        console.log('[BackgroundRunner] No new notifications');
        resolve();
        return;
      }

      console.log('[BackgroundRunner] Scheduling', newItems.length, 'notification(s)');

      // Cap at 5 per run to avoid flooding the notification tray
      var toShow = newItems.slice(0, 5);

      toShow.forEach(function(notification, index) {
        var type      = notification.type || '';
        var channelId = channelIdForType(type);

        // Suppress high-priority alerts in background runner as they are 
        // primarily handled by FCM Data-Only pushes for the Uber-style UI.
        if (channelId === 'homswag_ringtone') {
          return;
        }

        var title     = notification.title || fallbackTitleForType(type);
        var body      = stripHtml(notification.body || notification.message || 'You have a new notification');
        // Stagger by 1 s so each notification has a distinct schedule time
        var scheduleAt = new Date(Date.now() + (index + 1) * 1000);
        // Keep the ID within Android's int32 range
        var notifId = Math.abs(parseInt(String(notification.id), 10) || (Date.now() + index)) % 2147483647;

        CapacitorNotifications.schedule([{
          id:         notifId,
          title:      title,
          body:       body,
          scheduleAt: scheduleAt,
          // channelId selects the Android notification channel.
          // The channel is pre-created by the app with default sound and
          // vibration enabled — no sound file is set here so the device's
          // default notification tone is used automatically.
          channelId:  channelId,
          extra:      notification.data || {},
        }]);
      });

      // Persist seen IDs (capped at 100) to prevent duplicate notifications
      var allShownIds = lastSeenIds.concat(newItems.map(function(n) { return String(n.id); }));
      CapacitorKV.set('lastSeenNotifIds', JSON.stringify(allShownIds.slice(-100)));

      resolve();
    })
    .catch(function(err) {
      console.error('[BackgroundRunner] Error:', err);
      resolve(); // Always resolve — never let an error kill the background task
    });
});
