import fs from "fs";
import path from "path";
import { exec } from "child_process";
import Logger from "../../framework/logger.js";

const CHECK_INTERVAL_MS = 1000;
const WINDOW_SECONDS = 5;
const triggeredKeys = new Set();

function toSeconds(timeStr) {
	if (typeof timeStr !== "string") {
		return NaN;
	}

	const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
	if (!match) {
		return NaN;
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const seconds = match[3] ? Number(match[3]) : 0;

	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
		return NaN;
	}

	return hours * 3600 + minutes * 60 + seconds;
}

function getNowSeconds() {
	const now = new Date();
	return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
}

function getDateKey(date = new Date()) {
	const yyyy = date.getFullYear();
	const mm = String(date.getMonth() + 1).padStart(2, "0");
	const dd = String(date.getDate()).padStart(2, "0");
	return `${yyyy}-${mm}-${dd}`;
}

function isWeekend(date = new Date()) {
	const day = date.getDay();
	return day === 0 || day === 6;
}

function matchWhen(whenRaw, date = new Date()) {
	const when = String(whenRaw || "EVERYDAY").trim().toUpperCase();

	if (when === "EVERYDAY" || when === "每天") {
		return true;
	}

	if (when === "WORKDAYS" || when === "工作日") {
		return !isWeekend(date);
	}

	if (when === "WEEKENDS" || when === "周末") {
		return isWeekend(date);
	}

	return false;
}

function readConfig() {
	const configPath = path.join(import.meta.dirname, "config.json");
	const content = fs.readFileSync(configPath, "utf-8");
	const parsed = JSON.parse(content);
	return Array.isArray(parsed?.ShutDownTimes) ? parsed.ShutDownTimes : [];
}

function shouldTrigger(nowSec, targetSec) {
	return Number.isFinite(targetSec) && Math.abs(nowSec - targetSec) <= WINDOW_SECONDS;
}

function triggerShutdown() {
	// Windows immediate shutdown command.
	exec("shutdown /s /t 0", (error) => {
		if (error) {
			Logger.error("SHUTDOWN", `执行关机命令失败: ${error.message}`);
			return;
		}
		Logger.warn("SHUTDOWN", "已触发关机命令: shutdown /s /t 0");
	});
}

function clearOldTriggeredKeys(todayKey) {
	for (const key of triggeredKeys) {
		if (!key.startsWith(`${todayKey}|`)) {
			triggeredKeys.delete(key);
		}
	}
}

function checkAndShutdown(schedule) {
	const now = new Date();
	const todayKey = getDateKey(now);
	clearOldTriggeredKeys(todayKey);

	const nowSec = getNowSeconds();

	for (const item of schedule) {
		const timeStr = item?.Time;
		const when = item?.When;

		if (!matchWhen(when, now)) {
			continue;
		}

		const targetSec = toSeconds(timeStr);
		if (!Number.isFinite(targetSec)) {
			Logger.warn("SHUTDOWN", `跳过无效时间配置: ${timeStr}`);
			continue;
		}

		if (!shouldTrigger(nowSec, targetSec)) {
			continue;
		}

		const triggerKey = `${todayKey}|${timeStr}|${String(when || "EVERYDAY")}`;
		if (triggeredKeys.has(triggerKey)) {
			continue;
		}

		triggeredKeys.add(triggerKey);
		Logger.warn("SHUTDOWN", `命中关机时间窗口: ${timeStr} (${when || "EVERYDAY"})`);
		triggerShutdown();

		// Trigger once is enough; system will shut down.
		break;
	}
}

export async function init() {
	try {
		const schedule = readConfig();
		if (schedule.length === 0) {
			Logger.warn("SHUTDOWN", "未配置 ShutDownTimes，跳过关机定时检查");
			return;
		}

		Logger.info("SHUTDOWN", `已加载 ${schedule.length} 条关机定时，检查窗口 ±${WINDOW_SECONDS} 秒`);
		checkAndShutdown(schedule);

		setInterval(() => {
			checkAndShutdown(schedule);
		}, CHECK_INTERVAL_MS);
	} catch (error) {
		Logger.error("SHUTDOWN", `初始化关机组件失败: ${error.message}`);
	}
}

