export const handleError = (error, requestId = 'unknown') => {
    logError(`[${requestId}] Error: ${error.message}`);
    logError(`[${requestId}] Stack trace: ${error.stack}`);

    let statusCode = 500;
    let message = 'Đã xảy ra lỗi, vui lòng thử lại sau';

    if (error.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(error.errors)
            .map(err => err.message)
            .join(', ');
    } else if (error.name === 'CastError') {
        statusCode = 400;
        message = 'Dữ liệu không hợp lệ';
    } else if (error.code === 11000) {
        statusCode = 409;
        message = 'Dữ liệu đã tồn tại';
    } else if (error.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Token không hợp lệ';
    } else if (error.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token đã hết hạn';
    }

    return {
        success: false,
        message,
        statusCode
    };
}; 