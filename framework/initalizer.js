import configHandler from "./configHandler.js";
import componentHandler from "./componentHandler.js";
import Logger from "./logger.js";

class Initializer {

    /**
     * 初始化应用
     * @returns {Promise<void>}
     */
    async init() {
        Logger.info("INIT", "读取配置文件");
        configHandler.readConfig();

        Logger.info("INIT", "注册组件");
        const componentPaths = await componentHandler.walkComponents();
        await componentHandler.registerComponent(componentPaths);

        Logger.info("INIT", "应用配置文件");
        configHandler.applyConfig();
    }
}

export default new Initializer();