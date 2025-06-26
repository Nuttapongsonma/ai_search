
// export default {
//   mode: 'universal',
//   // target: 'server',
//   /*
//   ** Headers of the page
//   */
//   head: {
//     title: process.env.npm_package_name || '',
//     meta: [
//       { charset: 'utf-8' },
//       { name: 'viewport', content: 'width=device-width, initial-scale=1' },
//       { hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
//     ],
//     link: [
//       { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
//     ]
//   },
//   /*
//   ** Customize the progress-bar color
//   */
//   loading: { color: '#fff' },
//   /*
//   ** Global CSS
//   */
//   css: [
//   ],
//   /*
//   ** Plugins to load before mounting the App
//   */
//   plugins: [
//   ],
//   /*
//   ** Nuxt.js dev-modules
//   */
//   buildModules: [
//   ],
//   /*
//   ** Nuxt.js modules
//   */
//   modules: [
//   ],
//   /*
//   ** Build configuration
//   */
//   build: {
//     /*
//     ** You can extend webpack config here
//     */
//     extend (config, ctx) {
//     }
//   }
// }
module.exports = {
  mode: 'universal',
  target: 'server', // ✅ เปิดโหมด SSR server target
  ssr: true,         // ✅ เน้นบอกว่าเป็น SSR
  head: {
    title: process.env.npm_package_name || '',
    meta: [
      { charset: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { hid: 'description', name: 'description', content: process.env.npm_package_description || '' }
    ],
    link: [
      { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
    ]
  },
  loading: { color: '#fff' },
  css: [],
  plugins: [],
  buildModules: [],
  modules: [],
  build: {
    standalone: true,  // ✅ สำคัญมากสำหรับ Vercel build Nuxt SSR แบบ Standalone
    extend(config, ctx) {}
  }
}
