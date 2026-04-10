import type { Connect } from 'vite'
import type { Plugin } from 'vite'

function stringifyArg(v: unknown): string {
  if (v instanceof Error) return v.stack ?? v.message
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v)
  } catch {
    try {
      return String(v)
    } catch {
      return '[unprintable]'
    }
  }
}

/**
 * Forward browser console + window errors to the terminal where `vite` runs
 * (similar idea to Bun.serve({ development: { console: true } }), which only
 * applies to Bun’s own dev server, not Vite).
 */
export function clientConsoleToTerminal(): Plugin {
  return {
    name: 'client-console-to-terminal',
    apply: 'serve',
    configureServer(server) {
      const handler: Connect.NextHandleFunction = (req, res, next) => {
        const pathOnly = req.url?.split('?')[0] ?? ''
        if (pathOnly !== '/__client_console' || req.method !== 'POST') {
          next()
          return
        }
        const chunks: Buffer[] = []
        req.on('data', (c) => {
          chunks.push(c as Buffer)
        })
        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8')
            const payload = JSON.parse(raw) as {
              kind?: string
              level?: string
              message?: string
              stack?: string
              args?: unknown[]
            }
            const prefix = '\x1b[36m[browser]\x1b[0m'
            if (payload.kind === 'error' && payload.message != null) {
              console.error(prefix, payload.message, payload.stack ?? '')
            } else {
              const level = payload.level ?? 'log'
              const line =
                payload.args != null
                  ? payload.args.map(stringifyArg).join(' ')
                  : (payload.message ?? '')
              if (level === 'warn') console.warn(prefix, line)
              else if (level === 'error') console.error(prefix, line)
              else if (level === 'info') console.info(prefix, line)
              else if (level === 'debug') console.debug(prefix, line)
              else console.log(prefix, line)
            }
            res.statusCode = 204
            res.end()
          } catch {
            res.statusCode = 400
            res.end()
          }
        })
      }
      server.middlewares.use(handler)
    },
    transformIndexHtml(html) {
      const inject = `
<script type="module">
(function () {
  var url = '/__client_console';
  function send(body) {
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(function () {});
    } catch (_) {}
  }
  function argList(args) {
    return Array.prototype.slice.call(args).map(stringifyArg);
  }
  function stringifyArg(v) {
    if (v instanceof Error) return v.stack || v.message;
    if (typeof v === 'string') return v;
    try {
      return JSON.stringify(v);
    } catch (_) {
      try {
        return String(v);
      } catch (__) {
        return '[unprintable]';
      }
    }
  }
  ['log', 'info', 'warn', 'error', 'debug'].forEach(function (level) {
    var orig = console[level];
    if (typeof orig !== 'function') return;
    console[level] = function () {
      send({ level: level, args: argList(arguments) });
      return orig.apply(console, arguments);
    };
  });
  window.addEventListener('error', function (ev) {
    send({
      kind: 'error',
      message: ev.message,
      stack: ev.error && ev.error.stack ? String(ev.error.stack) : '',
    });
  });
  window.addEventListener('unhandledrejection', function (ev) {
    var r = ev.reason;
    send({
      kind: 'error',
      message: r instanceof Error ? r.message : String(r),
      stack: r instanceof Error && r.stack ? r.stack : '',
    });
  });
})();
</script>`
      return html.replace('<head>', `<head>${inject}`)
    },
  }
}
