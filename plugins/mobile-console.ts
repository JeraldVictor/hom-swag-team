/**
 * vite-plugin-mobile-console
 *
 * Dev-only Vite plugin that forwards console.log / warn / error and uncaught
 * errors from the Android WebView to the Vite dev server terminal.
 *
 * How it works:
 *  1. Registers a POST /__console middleware on the Vite dev server.
 *  2. Injects an inline <script> at the top of <head> that:
 *     - Wraps every console method to also POST the log data to /__console
 *     - Forwards window `error` and `unhandledrejection` events as errors
 *
 * The injected script uses a plain XHR (not fetch) so it is never intercepted
 * by CapacitorHttp and always reaches the local Vite server directly.
 */

import type { Plugin, ViteDevServer } from 'vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const ENDPOINT = '/__console'

const LEVEL_COLORS: Record<string, string> = {
  log:   '\x1b[37m',   // white
  info:  '\x1b[36m',   // cyan
  warn:  '\x1b[33m',   // yellow
  error: '\x1b[31m',   // red
  debug: '\x1b[35m',   // magenta
}
const RESET = '\x1b[0m'
const DIM   = '\x1b[2m'

function print(level: string, args: unknown[]): void {
  const color = LEVEL_COLORS[level] ?? LEVEL_COLORS.log
  const label = `${color}[mobile:${level}]${RESET}`
  const msg = args
    .map(a => (a !== null && typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)))
    .join(' ')
  const time = `${DIM}${new Date().toLocaleTimeString()}${RESET}`
  process.stdout.write(`  ${time} ${label} ${msg}\n`)
}

/** Inline script injected into every page in dev mode. */
const INJECTED_SCRIPT = /* js */ `(function () {
  var EP = '/__console';
  var _orig = {};

  function serialize(a) {
    if (a instanceof Error) return a.stack || a.message;
    try { return typeof a === 'object' && a !== null ? JSON.parse(JSON.stringify(a)) : a; }
    catch (_) { return String(a); }
  }

  function send(level, args) {
    // Wrap everything — if any transport throws it must NEVER propagate to
    // the caller (console.warn/error called by Vue internals), otherwise Vue
    // initialization crashes and the screen stays blank.
    try {
      var payload = JSON.stringify({ level: level, args: args.map(serialize) });
      // Prefer sendBeacon: fire-and-forget, not intercepted by CapacitorHttp,
      // no XHR state-machine issues. Falls back to fetch (which CapacitorHttp
      // patches correctly) if sendBeacon is unavailable.
      if (navigator.sendBeacon) {
        navigator.sendBeacon(EP, new Blob([payload], { type: 'application/json' }));
      } else {
        fetch(EP, { method: 'POST', body: payload, headers: { 'Content-Type': 'application/json' } }).catch(function(){});
      }
    } catch (_) { /* silently ignore — never crash the caller */ }
  }

  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (lvl) {
    _orig[lvl] = console[lvl].bind(console);
    console[lvl] = function () {
      try { _orig[lvl].apply(console, arguments); } catch(_) {}
      send(lvl, Array.prototype.slice.call(arguments));
    };
  });

  window.addEventListener('error', function (e) {
    try {
      var msg = e.error
        ? (e.error.stack || e.error.message || String(e.error))
        : (e.message + ' (' + e.filename + ':' + e.lineno + ':' + e.colno + ')');
      send('error', ['[uncaught error]', msg]);
    } catch(_) {}
  });

  window.addEventListener('unhandledrejection', function (e) {
    try {
      var r = e.reason;
      var msg = r instanceof Error ? (r.stack || r.message) : String(r);
      send('error', ['[unhandledRejection]', msg]);
    } catch(_) {}
  });
})();`

export function mobileConsolePlugin(): Plugin {
  return {
    name: 'vite-plugin-mobile-console',
    apply: 'serve',

    configureServer(server: ViteDevServer) {
      server.middlewares.use(
        ENDPOINT,
        (req: IncomingMessage, res: ServerResponse) => {
          // Allow preflight (in case browser sends CORS OPTIONS)
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

          if (req.method === 'OPTIONS') {
            res.writeHead(204)
            res.end()
            return
          }

          let body = ''
          req.on('data', (chunk: Buffer) => { body += chunk.toString() })
          req.on('end', () => {
            try {
              const { level, args } = JSON.parse(body) as {
                level: string
                args: unknown[]
              }
              print(level, args)
            } catch {
              // ignore malformed payloads (sendBeacon may send text/plain)
            }
            res.writeHead(204)
            res.end()
          })
        },
      )

      // Print a banner so the developer knows logs are being forwarded
      server.httpServer?.once('listening', () => {
        console.log(
          `\n  ${LEVEL_COLORS.info}[mobile-console]${RESET} Android WebView logs will appear here during live-reload.\n`,
        )
      })
    },

    transformIndexHtml() {
      return [
        {
          tag: 'script',
          injectTo: 'head-prepend',
          children: INJECTED_SCRIPT,
        },
      ]
    },
  }
}
