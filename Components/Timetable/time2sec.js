function time2sec(timeStr) {
	if (typeof timeStr !== 'string') {
		throw new TypeError('输入必须是字符串');
	}

	const trimmed = timeStr.trim();
	const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
	if (!match) {
		throw new Error('无效的时间格式。使用 HH:MM 或 HH:MM:SS');
	}

	const hours = Number(match[1]);
	const minutes = Number(match[2]);
	const seconds = match[3] === undefined ? 0 : Number(match[3]);

	if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59 || seconds < 0 || seconds > 59) {
		throw new Error('无效的时间值，必须符合 24 小时制');
	}

	return hours * 3600 + minutes * 60 + seconds;
}