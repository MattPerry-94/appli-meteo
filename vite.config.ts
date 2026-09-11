import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Préfixe vide : charge aussi les variables sans préfixe VITE_, qui restent
  // confinées au serveur de dev et ne sont jamais inlinées dans le bundle.
  const env = loadEnv(mode, process.cwd(), "");
  const meteoFranceApiKey = (env.METEOFRANCE_API_KEY ?? "").trim();

  return {
    build: {
      sourcemap: 'hidden',
      rollupOptions: {
        output: {
          // Sépare les grosses dépendances du code applicatif : sans ça le bundle
          // unique dépasse la limite de 500 kB et Rollup émet un avertissement.
          manualChunks: {
            pdfjs: ['pdfjs-dist'],
            react: ['react', 'react-dom', 'react-router-dom'],
          },
        },
      },
    },
    server: {
      proxy: {
        // Équivalent local de api/meteofrance/[...path].ts : la clé est ajoutée
        // ici, côté serveur de dev, et ne transite jamais par le navigateur.
        "/api/meteofrance": {
          target: "https://public-api.meteofrance.fr",
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/meteofrance/, "/public/DPVigilance/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (meteoFranceApiKey) proxyReq.setHeader("ApiKey", meteoFranceApiKey);
            });
          },
        },
      },
    },
    plugins: [
      react({
        babel: {
          plugins: [
            'react-dev-locator',
          ],
        },
      }),
      tsconfigPaths()
    ],
  }
})
