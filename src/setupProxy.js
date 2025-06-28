const {createProxyMiddleware} = require('http-proxy-middleware');


module.exports = function(app) {
    // 定义所有需要转发给 Dify 服务的路径前缀
    const proxyPaths = [
        '/api',
        '/_next',       // 用于 Next.js 的静态资源 (JS, CSS)
        '/logo',        // 用于 Logo 等图片资源
        '/console',
        '/favicon.ico',  // 用于网站图标
        'console',
        '/static/css', // 关键：主动监听这个被篡改后的错误路径
        '/static/chunks', // 关键：主动监听这个被篡改后的错误路径
    ];

    app.use(
        proxyPaths, // 拦截开头的请求
        createProxyMiddleware({
        target: 'http://xxxx', // Dify 服务地址
        changeOrigin: true,
        
        // 使用函数进行路径重写，提供更强的控制
        pathRewrite: (path, req) => {
            // 规则一：处理初次加载的 /api 路径
            // 只对以 /api 开头的路径进行重写
            if (path.startsWith('/api')) {
                // 将 '/api' 前缀移除
                return path.replace('/api', '');
            }

             // 规则二: 将被篡改的/static/css 路径修复回正确的 /_next/static/css
            if (path.startsWith('/static/css')) {
                return path.replace('/static/css', '/_next/static/css');
            }

            // 规则三: 将被篡改的 /static/chunks 路径修复回正确的 /_next/static/chunks
            if (path.startsWith('/static/chunks')) {
                return path.replace('/static/chunks', '/_next/static/chunks');
            }

            // 其他路径 (如 /_next/...) 保持原样，不做任何修改
            return path;
        },

        // 监听reactapp代理事件
        selfHandleResponse: true, 
        on: {
            proxyReq: (proxyReq, req, res) => {
            // 移除 accept-encoding 来避免 Gzip 问题
            // 告诉服务器我们不接受压缩格式的响应。
            // 服务器因此会返回未经压缩的 HTML/JS，从而避免了 .gz 下载问题。
            proxyReq.removeHeader('accept-encoding');
            console.log(`[ProxyReq] API Proxy Request: Forwarding ${req.method} ${req.url} to ${proxyReq.host}${proxyReq.path}`);
            },
            proxyRes: (proxyRes, req, res) => {
            console.log(`[ProxyRes] Static Proxy Response: Received ${proxyRes.statusCode} for ${req.url}`);
            proxyRes.pipe(res); // 将响应流回传给浏览器
            },
            error: (err, req, res) => {
            console.error('[Proxy Error] :', err);
            },
        },
        })
    );
};
