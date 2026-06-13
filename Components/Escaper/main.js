import path from "node:path";
import { fileURLToPath } from "node:url";
import { exec } from "node:child_process";
import fs from "node:fs";
import koffi from 'koffi';

import Logger from "../../framework/logger.js";

const __filepath = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filepath);

const configPath = path.join(__dirname, "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
const escapingProcesses = (config.EscapingProcesses || config.ExemptedProcesses || []).map(p => String(p).replace(/\.exe$/i, "").toLowerCase()).filter(Boolean);
const escapingWebsites = (config.EscapingWebsites || config.ExemptedWebsites || []).map(site => String(site).trim().toLowerCase()).filter(Boolean);

const dllPath = path.join(__dirname, "MicMonit64.dll");
const lib = koffi.load(dllPath);

const MicEventCallback = koffi.proto(
    'void __cdecl MicEventCallback(int eventType, uint32 pid, str processName)'
);

// 导出函数
const MicMonit_Start = lib.func('int __cdecl MicMonit_Start(MicEventCallback *callback)');
const MicMonit_Stop = lib.func('void __cdecl MicMonit_Stop()');

// 回调
const cb = koffi.register((eventType, pid, processName) => {
    if (eventType === 0) {
        Escaper();
        Logger.info("ESCAPER", `麦克风调用: pid=${pid} app=${processName}`);
    } else {
        Logger.info("ESCAPER", `麦克风关闭: pid=${pid} app=${processName}`);
    }
}, koffi.pointer(MicEventCallback));

// 清理
function shutdown() {
    try { MicMonit_Stop(); } catch { }
    try { koffi.unregister(cb); } catch { }
}

process.once('SIGINT', () => { shutdown(); process.exit(0); });
process.once('SIGTERM', () => { shutdown(); process.exit(0); });
process.once('exit', shutdown);

// 启动
export async function init() {
    const ret = MicMonit_Start(cb);
    if (ret !== 0) {
        koffi.unregister(cb);
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

function runPowerShell(script, callback) {
    const encoded = Buffer.from(script, "utf16le").toString("base64");
    exec(`powershell -NoProfile -EncodedCommand ${encoded}`, callback);
}

const getForegroundInfoPS = `$ErrorActionPreference='SilentlyContinue'; Add-Type -TypeDefinition 'using System; using System.Runtime.InteropServices; public class _FW { [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow(); [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint p); }'; $h=[_FW]::GetForegroundWindow(); $p=0; [_FW]::GetWindowThreadProcessId($h,[ref]$p)|Out-Null; $proc=Get-Process -Id $p -ErrorAction SilentlyContinue; $name=''; if($proc){$name=$proc.Name.ToLower()} $url=''; if($name -in @('chrome','msedge')) { try { Add-Type -AssemblyName UIAutomationClient | Out-Null; Add-Type -AssemblyName UIAutomationTypes | Out-Null; $root=[System.Windows.Automation.AutomationElement]::FromHandle($h); if($root){ $cond=New-Object System.Windows.Automation.PropertyCondition([System.Windows.Automation.AutomationElement]::ControlTypeProperty,[System.Windows.Automation.ControlType]::Edit); $edits=$root.FindAll([System.Windows.Automation.TreeScope]::Descendants,$cond); for($i=0;$i -lt $edits.Count;$i++){ $edit=$edits.Item($i); $value=''; try { $vp=$edit.GetCurrentPattern([System.Windows.Automation.ValuePattern]::Pattern); $value=$vp.Current.Value } catch { try { $lp=$edit.GetCurrentPattern([System.Windows.Automation.LegacyIAccessiblePattern]::Pattern); $value=$lp.Current.Value } catch {} } if(-not $value){ continue } $v=$value.Trim(); $n=($edit.Current.Name + '').ToLower(); if($v -notmatch '\s' -and ($n -match 'address|search|omnibox|地址|搜索|网址' -or $n -eq '')){ $url=$v; break } } } } catch {} } [pscustomobject]@{ process=$name; url=$url } | ConvertTo-Json -Compress`;
function Escaper() {
    runPowerShell(getForegroundInfoPS, (err, stdout) => {
        if (err) {
            Logger.error("ESCAPER", `获取前台进程失败: ${err.message}`);
            return;
        }

        let foregroundInfo;
        try {
            foregroundInfo = JSON.parse(stdout.trim());
        } catch {
            Logger.error("ESCAPER", `解析前台信息失败: ${stdout.trim()}`);
            return;
        }

        const foreground = (foregroundInfo.process || "").trim().toLowerCase();
        const activeUrl = (foregroundInfo.url || "").trim();
        const isBrowser = ["chrome", "msedge"].includes(foreground);

        if (isBrowser) {
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

        exec('powershell -NoProfile -Command "(New-Object -ComObject Shell.Application).MinimizeAll()"', (e) => {
            if (e) Logger.error("ESCAPER", `返回桌面失败: ${e.message}`);
        });
    });
}