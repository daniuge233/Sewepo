import * as fs from 'fs';
import path from "path";
import Logger from "./logger.js";
import { generateSmartPalette } from "./utils/inteColor.js";

class ConfigHandler {
    constructor() {
        this.config = {};
    }

    /**
     * 读取配置文件
     */
    readConfig() {
        const configPath = path.join(import.meta.dirname, "config.json");
        try {
            const data = fs.readFileSync(configPath, "utf-8");
            this.config = JSON.parse(data);
            Logger.info("CONFIG", "配置文件读取成功");
        } catch (error) {
            Logger.error("CONFIG", `读取配置文件失败: ${error.message}`);
        }
    }

    /**
     * 应用配置文件
     */
    applyConfig() {
        this.applyStyles();
    }

    applyStyles() {
        const styles = this.config?.Styles;
        if (!styles || !styles.MainColor) {
            Logger.warn("CONFIG", "未检测到主色调配置，跳过颜色配置应用");
            return;
        }

        try {
            const palette = generateSmartPalette(styles.MainColor, {
                scheme: styles.ColorScheme,
                backgroundMode: styles.BackgroundMode
            });

            const cssBlock = [
                "/* SEWEPO_THEME_START */",
                ":root {",
                `    --color-primary: ${palette.primary};`,
                `    --color-secondary: ${palette.secondary};`,
                `    --color-accent: ${palette.accent};`,
                `    --color-background: ${palette.background};`,
                `    --color-surface: ${palette.surface};`,
                `    --color-border: ${palette.border};`,
                `    --color-text-on-primary: ${palette.textOnPrimary};`,
                `    --color-text-on-background: ${palette.textOnBackground};`,
                `    --color-primary-hover: ${palette.states.hover};`,
                `    --color-primary-active: ${palette.states.active};`,
                `    --color-primary-disabled: ${palette.states.disabled};`,
                "}",
                "/* SEWEPO_THEME_END */"
            ];

            const templateCssPath = path.join(import.meta.dirname, "statics", "css", "colorTemplate.css");
            const hasFile = fs.existsSync(templateCssPath);
            const original = hasFile ? fs.readFileSync(templateCssPath, "utf-8") : "";
            const eol = original.includes("\r\n") ? "\r\n" : "\n";
            const originalLines = original ? original.split(/\r?\n/) : [];

            // 仅重建第 1~15 行配色区块，永久保留第 16 行及以下内容。
            const preservedTail = originalLines.length >= 16
                ? originalLines.slice(15).join(eol)
                : "";

            const themeBlock = cssBlock.join(eol);
            const nextContent = preservedTail
                ? `${themeBlock}${eol}${preservedTail}`
                : `${themeBlock}${eol}`;

            fs.writeFileSync(templateCssPath, nextContent, "utf-8");
            Logger.info("CONFIG", `应用颜色配置成功`);
        } catch (error) {
            Logger.error("CONFIG", `应用颜色配置失败: ${error.message}`);
        }
    }

    /**
     * 获取配置对象
     * @returns {Object} 配置对象
     */
    getConfig() {
        return this.config;
    }
}

export default new ConfigHandler();