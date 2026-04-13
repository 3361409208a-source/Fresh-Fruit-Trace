const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
      timeout: 600000,
      proxyTimeout: 600000,
      logger: console,
      onError: (err, req, res) => {
        console.error('[Proxy Error]', err.message);
      },
    })
  );
};
