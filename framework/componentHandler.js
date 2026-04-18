import Logger from "./logger.js";
import * as fs from 'fs';
import path from "path";

class ComponentHandler {
    constructor() {
        this.components = {};
    }

    /**
     * 遍历 Components 目录，返回所有 component.json 文件路径
     * @returns {Promise<Array>} component.json 文件路径数组
     */
    async walkComponents() {
        const componentsPath = path.join(import.meta.dirname, "../Components");
        const componentPaths = [];
        
        try {
            // 检查目录是否存在
            if (!fs.existsSync(componentsPath)) {
                Logger.warn("COMPONENT", `Components 目录不存在: ${componentsPath}`);
                return componentPaths;
            }

            // 读取 Components 目录下的所有文件夹
            const dirs = fs.readdirSync(componentsPath, { withFileTypes: true });
            
            for (const dir of dirs) {
                if (dir.isDirectory()) {
                    const componentJsonPath = path.join(componentsPath, dir.name, "component.json");
                    
                    // 检查是否存在 component.json
                    if (fs.existsSync(componentJsonPath)) {
                        componentPaths.push({
                            path: componentJsonPath,
                            name: dir.name
                        });
                    }
                }
            }
            
            Logger.info("COMPONENT", `找到 ${componentPaths.length} 个组件`);
            return componentPaths;
        } catch (error) {
            Logger.error("COMPONENT", `遍历组件目录失败: ${error.message}`);
            return componentPaths;
        }
    }

    /**
     * 注册组件
     * @param {Array} componentPaths - 组件路径数组，包含 { path, name } 对象
     */
    async registerComponent(componentPaths) {
        if (!Array.isArray(componentPaths) || componentPaths.length === 0) {
            Logger.warn("COMPONENT", "没有要注册的组件");
            return;
        }

        for (const component of componentPaths) {
            try {
                const content = await fs.promises.readFile(component.path, "utf-8");
                const componentConfig = JSON.parse(content);
                
                // 将组件配置存储
                this.components[component.name] = componentConfig;
                
                Logger.info("COMPONENT", `已注册组件${component.name}`);
                
                if (componentConfig.Entry) {
                    try {
                        const componentDir = path.dirname(component.path);
                        const entryPath = path.join(componentDir, componentConfig.Entry);
                        
                        if (!fs.existsSync(entryPath)) {
                            Logger.warn("COMPONENT", `未找到组件${component.name}的入口文件`);
                            continue;
                        }
                        
                        const entryModule = await import(`file://${entryPath}`);

                        if (typeof entryModule.init === "function") {
                            await entryModule.init();
                            Logger.info("COMPONENT", `已初始化组件${component.name}`);

                        } else if (typeof entryModule.default?.init === "function") {
                            await entryModule.default.init();
                            Logger.info("COMPONENT", `已初始化组件${component.name}`);

                        } else {
                            Logger.warn("COMPONENT", `组件${component.name}没有初始化函数: ${entryPath}`);
                        }
                    } catch (error) {
                        Logger.error("COMPONENT", `组件${component.name}初始化失败: ${error.message}`);
                    }
                }
            } catch (error) {
                Logger.error("COMPONENT", `读取${component.name}组件文件时失败: ${error.message}`);
            }
        }

        Logger.info("COMPONENT", "组件注册完成");
    }

    /**
     * 获取所有已注册的组件列表
     * @returns {Array} 组件数组，包含所有已注册的组件信息
     */
    getComponentList() {
        const componentList = Object.values(this.components);
        return componentList;
    }

    /**
     * 根据名称获取指定的组件
     * @param {string} name - 组件名称（对应目录名称）
     * @returns {object|null} 组件配置对象或 null
     */
    getComponent(name) {
        if (!name || typeof name !== 'string') {
            Logger.warn("COMPONENT", "获取组件时名称参数无效");
            return null;
        }

        const component = this.components[name];
        if (!component) {
            Logger.warn("COMPONENT", `未找到组件: ${name}`);
            return null;
        }

        return component;
    }
}

export default new ComponentHandler();