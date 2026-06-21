import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import koffi from 'koffi';

import Logger from "../../framework/logger.js";

const __filepath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filepath);

const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const escapingProcesses = (config.EscapingProcesses || config.ExemptedProcesses || []).map(p => String(p).replace(/\.exe$/i, "").toLowerCase()).filter(Boolean);
const escapingWebsites = (config.EscapingWebsites || config.ExemptedWebsites || []).map(site => String(site).trim().toLowerCase()).filter(Boolean);

const helperDllCandidate = path.join(__dirname, "WindowHelper.dll");

const dllPath = helperDllCandidate;
const lib = koffi.load(dllPath);
const GetForegroundProcessName = lib.func('str __cdecl WH_GetForegroundProcessName()');
const GetForegroundBrowserUrl = lib.func('str __cdecl WH_GetForegroundBrowserUrl()');
const MinimizeAllWindows = lib.func('void __cdecl WH_MinimizeAllWindows()');

const micMonitDllPath = path.join(__dirname, "MicMonit64.dll");
const micLib = koffi.load(micMonitDllPath);

const MicEventCallback = koffi.proto(
    'void __cdecl MicEventCallback(int eventType, uint32 pid, str processName)'
);

const MicMonit_Start = micLib.func('int __cdecl MicMonit_Start(MicEventCallback *callback)');
const MicMonit_Stop = micLib.func('void __cdecl MicMonit_Stop()');

const micCallback = koffi.register((eventType, pid, processName) => {
    if (eventType === 0) {
        Escaper();
        Logger.info("ESCAPER", `麦克风调用: pid=${pid} app=${processName}`);
    } else {
        Logger.info("ESCAPER", `麦克风关闭: pid=${pid} app=${processName}`);
    }
}, koffi.pointer(MicEventCallback));

function shutdown() {
    try { MicMonit_Stop(); } catch { }
    try { koffi.unregister(micCallback); } catch { }
}

process.once('SIGINT', () => { shutdown(); process.exit(0); });
process.once('SIGTERM', () => { shutdown(); process.exit(0); });
process.once('exit', shutdown);

export async function init() {
    const ret = MicMonit_Start(micCallback);
    if (ret !== 0) {
        koffi.unregister(micCallback);
        throw new Error(`MicMonit_Start failed: ${ret}`);
    }
    
    Logger.info("ESCAPER", "麦克风监控已启动");
}

function isEscapingWebsite(currentUrl) {
    if (!currentUrl) {
        return false;
    }

    const browserUrl = /^([a-z][a-z0-9+.-]*:)?\/\//i.test(currentUrl) ? currentUrl : `https://${currentUrl}`;
    const lowerUrl = currentUrl.toLowerCase();
    let hostname = "";

    try {
        hostname = new URL(browserUrl).hostname.toLowerCase();
    } catch {
        hostname = "";
    }

    return escapingWebsites.some((site) => {
        const normalized = site
            .replace(/^https?:\/\//i, "")
            .replace(/\/.*$/, "")
            .toLowerCase();

        const wildcardBase = normalized.startsWith("*.") ? normalized.slice(2) : "";

        if (hostname && wildcardBase) {
            return hostname === wildcardBase || hostname.endsWith(`.${wildcardBase}`);
        }

        if (hostname && normalized) {
            return hostname === normalized || hostname.endsWith(`.${normalized}`);
        }

        return lowerUrl.includes(site);
    });
}

function Escaper() {
    const foreground = String(GetForegroundProcessName() || "").trim().toLowerCase();
    const isBrowser = ["chrome", "msedge"].includes(foreground);
    let activeUrl = "";

    if (isBrowser) {
        activeUrl = String(GetForegroundBrowserUrl() || "").trim();
        if (!isEscapingWebsite(activeUrl)) {
            Logger.info("ESCAPER", `前台浏览器网址 ${activeUrl || "unknown"} 未命中黑名单，跳过返回桌面`);
            return;
        }
        Logger.info("ESCAPER", `前台浏览器网址 ${activeUrl} 命中黑名单，执行返回桌面`);
    } else {
        if (!escapingProcesses.includes(foreground)) {
            Logger.info("ESCAPER", `前台进程 ${foreground || "unknown"} 未命中黑名单，跳过返回桌面`);
            return;
        }
        Logger.info("ESCAPER", `前台进程 ${foreground} 命中黑名单，执行返回桌面`);
    }

    try {
        MinimizeAllWindows();
    } catch (error) {
        Logger.error("ESCAPER", `返回桌面失败: ${error.message}`);
    }
}