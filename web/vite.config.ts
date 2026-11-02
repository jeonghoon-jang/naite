import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * 로컬 개발용: npm run dev 에서도 web/api/*.ts (Vercel Functions)를 같은 코드로 실행한다.
 * 배포 환경에서는 Vercel 이 api/ 를 직접 실행하므로 이 플러그인은 쓰이지 않는다.
 */
function localApi(): Plugin {
  return {
    name: 'naite-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const m = req.url?.match(/^\/api\/([a-z0-9-]+)/)
        if (!m) return next()
        try {
          const mod = await server.ssrLoadModule(`/api/${m[1]}.ts`)
          const handler = mod[req.method ?? 'GET']
          if (typeof handler !== 'function') {
            res.statusCode = 405
            return res.end()
          }
          const chunks: Buffer[] = []
          for await (const c of req) chunks.push(c as Buffer)
          const r: Response = await handler(
            new Request(`http://localhost${req.url}`, {
              method: req.method,
              headers: { 'content-type': String(req.headers['content-type'] ?? ''), 'x-forwarded-for': req.socket.remoteAddress ?? 'local' },
              body: chunks.length ? Buffer.concat(chunks) : undefined,
            }),
          )
          res.statusCode = r.status
          r.headers.forEach((v, k) => res.setHeader(k, v))
          res.end(Buffer.from(await r.arrayBuffer()))
        } catch (e) {
          server.ssrFixStacktrace(e as Error)
          console.error(e)
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'local api error' }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // 서버 함수가 쓰는 키(OPENAI_API_KEY 등)를 루트 .env 에서 process.env 로 (로컬 개발 전용, 브라우저로 나가지 않음)
  Object.assign(process.env, { ...loadEnv(mode, '..', ''), ...process.env })
  return {
    plugins: [react(), tailwindcss(), localApi()],
    envDir: '..', // 루트 .env 하나만 쓴다
    server: { port: 5180, strictPort: true }, // 다른 프로젝트(5173)와 겹치지 않게 고정
  }
})
