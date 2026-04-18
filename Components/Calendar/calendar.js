(function () {
    let selectedDate = null;
    let bubbleTimer = null;

    function formatDiffToMidnight(targetDate) {
        const midnight = new Date(
            targetDate.getFullYear(),
            targetDate.getMonth(),
            targetDate.getDate(),
            0,
            0,
            0,
            0
        );

        const diffMs = midnight.getTime() - Date.now();
        const totalMinutes = Math.floor(Math.abs(diffMs) / 60000);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const month = targetDate.getMonth() + 1;
        const day = targetDate.getDate();

        if (diffMs >= 0) {
            return `到 ${month}月${day}日 00:00 还有 ${hours} 小时 ${minutes} 分`;
        }

        return `${month}月${day}日 00:00 已过去 ${hours} 小时 ${minutes} 分`;
    }

    function hideBubble() {
        const bubbleEl = document.getElementById('cal-bubble');
        if (bubbleTimer) {
            clearTimeout(bubbleTimer);
            bubbleTimer = null;
        }

        if (!bubbleEl) {
            return;
        }

        bubbleEl.classList.remove('show', 'align-left', 'align-right');
        bubbleEl.style.transform = 'none';
        bubbleEl.style.left = '-9999px';
        bubbleEl.style.top = '-9999px';
        selectedDate = null;
        document.querySelectorAll('.cal-cell.selected').forEach((el) => {
            el.classList.remove('selected');
        });
    }

    function showBubble(cell, message) {
        const bubbleEl = document.getElementById('cal-bubble');
        const sectionEl = document.querySelector('.calendar-section');
        if (!bubbleEl || !sectionEl) {
            return;
        }

        bubbleEl.textContent = message;
        bubbleEl.classList.remove('align-left', 'align-right');

        const cellRect = cell.getBoundingClientRect();
        const sectionRect = sectionEl.getBoundingClientRect();
        const sectionWidth = sectionRect.width;
        const sectionHeight = sectionRect.height;
        const cellCenterX = cellRect.left + cellRect.width / 2 - sectionRect.left;
        const isLeftSide = cellCenterX < sectionWidth / 2;
        const edgePadding = 8;

        if (isLeftSide) {
            bubbleEl.classList.add('align-left');
        } else {
            bubbleEl.classList.add('align-right');
        }

        // Measure size after style class is applied, then place with bounds clamping.
        bubbleEl.classList.add('show');
        bubbleEl.style.transform = 'none';
        bubbleEl.style.left = '0px';
        bubbleEl.style.top = '-9999px';

        const bubbleWidth = bubbleEl.offsetWidth;
        const bubbleHeight = bubbleEl.offsetHeight;
        const maxLeft = Math.max(edgePadding, sectionWidth - bubbleWidth - edgePadding);
        let left;

        if (isLeftSide) {
            left = cellRect.left - sectionRect.left;
        } else {
            left = cellRect.right - sectionRect.left - bubbleWidth;
        }

        left = Math.max(edgePadding, Math.min(left, maxLeft));

        const preferAboveTop = cellRect.top - sectionRect.top - bubbleHeight - 10;
        const belowTop = cellRect.bottom - sectionRect.top + 8;
        const top = preferAboveTop >= edgePadding
            ? preferAboveTop
            : Math.min(belowTop, Math.max(edgePadding, sectionHeight - bubbleHeight - edgePadding));

        bubbleEl.style.left = `${left}px`;
        bubbleEl.style.top = `${top}px`;

        if (bubbleTimer) {
            clearTimeout(bubbleTimer);
        }
        bubbleTimer = setTimeout(hideBubble, 5000);
    }

    function bindCellClick(cell, cellDate) {
        cell.addEventListener('click', () => {
            selectedDate = cellDate;

            document.querySelectorAll('.cal-cell.selected').forEach((el) => {
                el.classList.remove('selected');
            });

            cell.classList.add('selected');
            showBubble(cell, formatDiffToMidnight(selectedDate));
        });
    }

    function render() {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth(); // 0-indexed
        const date = today.getDate();

        const weekDayNames = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const weekDay = weekDayNames[today.getDay()];

        // Update header
        document.getElementById('cal-year-month').textContent = `${year}年${month + 1}月`;
        document.getElementById('cal-day').textContent = String(date).padStart(2, '0');
        document.getElementById('cal-weekday').textContent = weekDay;

        // Build calendar grid
        const grid = document.getElementById('cal-grid');
        grid.innerHTML = '';

        // First day of month (0=Sun … 6=Sat), convert to Mon-based (0=Mon … 6=Sun)
        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = (firstDay + 6) % 7; // Mon=0 … Sun=6

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const prevDays = new Date(year, month, 0).getDate();

        const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

        for (let i = 0; i < totalCells; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cal-cell');
            let cellDate;

            if (i < startOffset) {
                // Previous month overflow
                const d = prevDays - startOffset + 1 + i;
                cell.textContent = d;
                cellDate = new Date(year, month - 1, d);
                cell.classList.add('other-month');
            } else if (i >= startOffset + daysInMonth) {
                // Next month overflow
                const d = i - startOffset - daysInMonth + 1;
                cell.textContent = d;
                cellDate = new Date(year, month + 1, d);
                cell.classList.add('other-month');
            } else {
                const d = i - startOffset + 1;
                cell.textContent = d;
                cellDate = new Date(year, month, d);
                if (d === date) {
                    cell.classList.add('today');
                }
                // Highlight weekends (col index 5=Sat, 6=Sun in Mon-based)
                const col = i % 7;
                if (col === 5 || col === 6) {
                    cell.classList.add('weekend');
                }
            }

            bindCellClick(cell, cellDate);

            if (
                selectedDate &&
                cellDate.getFullYear() === selectedDate.getFullYear() &&
                cellDate.getMonth() === selectedDate.getMonth() &&
                cellDate.getDate() === selectedDate.getDate()
            ) {
                cell.classList.add('selected');
            }

            grid.appendChild(cell);
        }
    }

    document.addEventListener('DOMContentLoaded', () => {
        render();

        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            if (target.closest('.cal-cell') || target.closest('#cal-bubble')) {
                return;
            }

            hideBubble();
        });
    });
})();
