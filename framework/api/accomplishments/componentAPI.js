import ComponentHandler from "../../componentHandler.js";
import ResponseFormatter from "../responseFormatter.js";
import express from "express";

const router = express.Router();

/**
 * 获取所有已注册的组件列表
 * GET /listComponent
 * @returns {json} 组件列表数据
 */
router.get("/listComponent", (req, res) => {
    try {
        const components = ComponentHandler.getComponentList();
        
        res.json(ResponseFormatter.success(
            "获取成功",
            {
                total: components.length,
                components: components
            }
        ));
    } catch (error) {
        res.status(500).json(ResponseFormatter.serverError(
            "获取失败",
            error.message
        ));
    }
});

/**
 * 根据名称获取指定的组件
 * GET /getComponent?name=ExampleComponent
 * @param {string} name - 组件名称（查询参数）
 * @returns {json} 组件详细信息
 */
router.get("/getComponent", (req, res) => {
    try {
        const { name } = req.query;
        
        // 验证参数
        if (!name || typeof name !== 'string') {
            return res.status(400).json(ResponseFormatter.error(
                "组件名称缺失或无效",
                null,
                400
            ));
        }
        
        const component = ComponentHandler.getComponent(name);
        
        if (!component) {
            return res.status(404).json(ResponseFormatter.notFound(
                `未找到组件: ${name}`
            ));
        }
        
        res.json(ResponseFormatter.success(
            "获取成功",
            component
        ));
    } catch (error) {
        res.status(500).json(ResponseFormatter.serverError(
            "获取失败",
            error.message
        ));
    }
});

/**
 * 根据名称获取指定组件的页面 src 地址
 * GET /getComponentSrc?name=ExampleComponent
 * @param {string} name - 组件名称（查询参数）
 * @returns {json} 包含 src 字段的对象
 */
router.get("/getComponentSrc", (req, res) => {
    try {
        const { name } = req.query;

        if (!name || typeof name !== 'string') {
            return res.status(400).json(ResponseFormatter.error(
                "组件名称缺失或无效",
                null,
                400
            ));
        }

        const component = ComponentHandler.getComponent(name);

        if (!component) {
            return res.status(404).json(ResponseFormatter.notFound(
                `未找到组件: ${name}`
            ));
        }

        if (!component.Appearence) {
            return res.status(404).json(ResponseFormatter.notFound(
                `组件 ${name} 未配置 Appearence 字段`
            ));
        }

        res.json(ResponseFormatter.success(
            "获取成功",
            { src: `/Components/${name}/${component.Appearence}` }
        ));
    } catch (error) {
        res.status(500).json(ResponseFormatter.serverError(
            "获取失败",
            error.message
        ));
    }
});

export default router;