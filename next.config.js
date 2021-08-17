const withPWA = require('next-pwa')
const runtimeCaching = require('next-pwa/cache')
const prod = process.env.NODE_ENV === 'production'

module.exports = withPWA({
  images: {
    disableStaticImages: true
  },
  pwa: {
    disable: !prod,
    dest: 'public',
    runtimeCaching
  }
})
