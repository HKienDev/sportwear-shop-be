const allowedOrigins = [
  'http://localhost:3000',
  'https://sportwear-shop-fe.vercel.app',
  'https://www.vjusport.com',
  'https://vjusport.com',
  'https://sportwear-shop-be-production.up.railway.app'
];

const corsOptions = {
    origin: function (origin, callback) {
        // Cho phép request không có origin (ví dụ: mobile app, curl)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        } else {
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Access-Control-Allow-Headers',
        'Access-Control-Request-Method',
        'Access-Control-Request-Headers',
        'Access-Control-Allow-Origin',
        'Cache-Control',
        'Pragma',
        'X-CSRF-Token',
        'X-Requested-With',
        'Accept-Language',
        'Accept-Encoding',
        'Connection',
        'Host',
        'Referer',
        'User-Agent',
        'Expires',
        'If-Match',
        'If-None-Match',
        'If-Modified-Since',
        'If-Unmodified-Since',
        'Range',
        'If-Range',
        'Content-Range',
        'Content-Disposition',
        'Content-Encoding',
        'Content-Language',
        'Content-Location',
        'Content-MD5',
        'Content-Range',
        'Content-Type',
        'Last-Modified',
        'ETag'
    ],
    exposedHeaders: ['Set-Cookie', 'Authorization', 'Content-Range', 'Content-Encoding', 'ETag'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24 hours
};

export default corsOptions; 