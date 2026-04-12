const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      timeout: 600000,    // 10 min proxy timeout
      proxyTimeout: 600000,
      onError: (err, req, res) => {
        console.error('[Proxy Error]', err.message);
      },
    })
  );
};
