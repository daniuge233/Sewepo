/**
 * API 响应格式化
 * 示例：
 * {
        "success": true,
        "code": 200,
        "message": message,
        "data": { data }
    }
 */
class ResponseFormatter {
    /**
     * 生成成功响应
     * @param {string} message - 响应消息
     * @param {any} data - 响应数据
     * @param {number} code - HTTP 状态码（默认 200）
     * @returns {object} 格式化的响应对象
     */
    static success(message = "操作成功", data = null, code = 200) {
        return {
            success: true,
            code,
            message,
            data
        };
    }

    /**
     * 生成失败响应
     * @param {string} message - 错误消息
     * @param {any} data - 额外数据（可选）
     * @param {number} code - HTTP 状态码（默认 400）
     * @returns {object} 格式化的响应对象
     */
    static error(message = "操作失败", data = null, code = 400) {
        return {
            success: false,
            code,
            message,
            data
        };
    }

    /**
     * 生成 404 未找到响应
     * @param {string} message - 错误消息
     * @param {any} data - 额外数据（可选）
     * @returns {object} 格式化的响应对象
     */
    static notFound(message = "资源不存在", data = null) {
        return this.error(message, data, 404);
    }

    /**
     * 生成 500 服务器错误响应
     * @param {string} message - 错误消息
     * @param {any} data - 额外数据（可选）
     * @returns {object} 格式化的响应对象
     */
    static serverError(message = "服务器内部错误", data = null) {
        return this.error(message, data, 500);
    }
}

export default ResponseFormatter;
