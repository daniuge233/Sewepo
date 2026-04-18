function pad(n) {
    return String(n).padStart(2, '0');
}

function tick() {
    const now = new Date();
    document.getElementById('time-hours').textContent   = pad(now.getHours());
    document.getElementById('time-minutes').textContent = pad(now.getMinutes());
    document.getElementById('time-seconds').textContent = pad(now.getSeconds());
}

tick();
setInterval(tick, 1000);
