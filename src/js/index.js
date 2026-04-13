let files = [];
let dragSrcIdx = null;

const EXT_COLORS = {
    '.js': {bg: '#3b3200', color: '#f0c000'},
    '.jsx': {bg: '#3b3200', color: '#f0c000'},
    '.ts': {bg: '#003060', color: '#4db8ff'},
    '.tsx': {bg: '#003060', color: '#4db8ff'},
    '.py': {bg: '#003a30', color: '#3ecf8e'},
    '.java': {bg: '#1a3300', color: '#7ecf00'},
    '.kt': {bg: '#2a0040', color: '#c080ff'},
    '.swift': {bg: '#3d1400', color: '#ff6a30'},
    '.go': {bg: '#003040', color: '#00bcd4'},
    '.rs': {bg: '#3d1a00', color: '#ff8c42'},
    '.cpp': {bg: '#002040', color: '#4488ff'},
    '.c': {bg: '#002040', color: '#4488ff'},
    '.cs': {bg: '#1a0040', color: '#a070ff'},
    '.php': {bg: '#2a0040', color: '#bd7aff'},
    '.rb': {bg: '#3d0010', color: '#ff4466'},
    '.html': {bg: '#3d1400', color: '#ff7043'},
    '.css': {bg: '#002a3d', color: '#29b6f6'},
    '.scss': {bg: '#2a002a', color: '#f48fb1'},
    '.vue': {bg: '#003320', color: '#42d392'},
    '.svelte': {bg: '#3d1a00', color: '#ff6600'},
    '.json': {bg: '#1a1a00', color: '#d4c000'},
    '.xml': {bg: '#1a2a00', color: '#aab800'},
    '.yaml': {bg: '#001a2a', color: '#60a8ff'},
    '.yml': {bg: '#001a2a', color: '#60a8ff'},
    '.md': {bg: '#1a1a1a', color: '#aaaaaa'},
    '.sh': {bg: '#002800', color: '#60d060'},
    '.sql': {bg: '#002233', color: '#00bcd4'},
    '.txt': {bg: '#1a1a1a', color: '#888888'},
};

const DEFAULT_EXT_COLOR = {bg: '#1a1a2a', color: '#8888cc'};

function extColor(name) {
    const e = getExt(name);
    return EXT_COLORS[e] || DEFAULT_EXT_COLOR;
}

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('over');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('over'));

dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('over');
    addFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener('change', () => {
    addFiles([...fileInput.files]);
    fileInput.value = '';
});

document.addEventListener('paste', e => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        addFiles([...e.clipboardData.files]);
    }
});

function addFiles(newFiles) {
    const dupes = [];
    const added = [];
    newFiles.forEach(f => {
        if (files.find(x => x.name === f.name && x.size === f.size)) {
            dupes.push(f.name);
        } else {
            files.push(f);
            added.push(f.name);
        }
    });
    render();
    if (dupes.length && added.length) {
        log(`// додано ${added.length} файл(ів). Вже існують (пропущено): ${dupes.join(', ')}`, 'warn');
    } else if (dupes.length && !added.length) {
        log(`// помилка: всі ці файли вже додано — ${dupes.join(', ')}`, 'err');
    } else {
        log(`// додано ${added.length} файл(ів). Всього: ${files.length}`, 'ok');
    }
}

function removeFile(i) {
    files.splice(i, 1);
    render();
}

function clearAll() {
    files = [];
    render();
    log('// список очищено', '');
}

function sortFiles() {
    files.sort((a, b) => a.name.localeCompare(b.name));
    render();
}

function getExt(name) {
    const parts = name.split('.');
    return parts.length > 1 ? '.' + parts[parts.length - 1].toLowerCase() : '?';
}

function fmtSize(b) {
    if (b < 1024) return [b.toFixed(0), 'B'];
    if (b < 1024 * 1024) return [(b / 1024).toFixed(1), 'KB'];
    return [(b / (1024 * 1024)).toFixed(2), 'MB'];
}

function log(msg, cls) {
    const el = document.getElementById('log');
    el.textContent = msg;
    el.className = cls || '';
}

function render() {
    const hasFiles = files.length > 0;
    document.getElementById('files-panel').style.display = hasFiles ? '' : 'none';
    document.getElementById('stats-row').style.display = hasFiles ? 'grid' : 'none';

    if (hasFiles) {
        document.getElementById('s-count').textContent = files.length;
        const total = files.reduce((s, f) => s + f.size, 0);
        const [val, unit] = fmtSize(total);
        document.getElementById('s-size').textContent = val;
        document.getElementById('s-size-u').textContent = unit;
        const exts = new Set(files.map(f => getExt(f.name)));
        document.getElementById('s-exts').textContent = exts.size;
    }

    const list = document.getElementById('file-list');
    if (!hasFiles) {
        list.innerHTML = '<div class="empty-msg">// файли ще не додано</div>';
        return;
    }

    list.innerHTML = '';
    files.forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'file-row';
        row.draggable = true;
        row.dataset.idx = i;
        row.title = "Подвійний клік щоб відкрити";

        const ec = extColor(f.name);
        const e = getExt(f.name);
        const [sz, unit] = fmtSize(f.size);

        row.innerHTML = `
      <span class="drag-handle">⠿</span>
      <span class="file-idx">${i + 1}</span>
      <span class="ext" style="background:${ec.bg};color:${ec.color}">${e}</span>
      <span class="fname">${f.name}</span>
      <span class="fsize">${sz} ${unit}</span>
      <button class="rm" onclick="event.stopPropagation(); removeFile(${i})">✕</button>
    `;

        row.addEventListener('dragstart', function (ev) {
            dragSrcIdx = parseInt(this.dataset.idx);
            ev.dataTransfer.effectAllowed = 'move';
            setTimeout(() => this.classList.add('dragging'), 0);
        });
        row.addEventListener('dragend', function () {
            this.classList.remove('dragging');
            document.querySelectorAll('.file-row').forEach(r => r.classList.remove('drag-target'));
            dragSrcIdx = null;
        });
        row.addEventListener('dragover', function (ev) {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = 'move';
            document.querySelectorAll('.file-row').forEach(r => r.classList.remove('drag-target'));
            this.classList.add('drag-target');
        });
        row.addEventListener('dragleave', function () {
            this.classList.remove('drag-target');
        });
        row.addEventListener('drop', function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            this.classList.remove('drag-target');
            const to = parseInt(this.dataset.idx);
            if (dragSrcIdx === null || dragSrcIdx === to) return;
            const item = files.splice(dragSrcIdx, 1)[0];
            files.splice(to, 0, item);
            dragSrcIdx = null;
            render();
        });

        row.addEventListener('dblclick', function () {
            openModal(i);
        });

        let lastTap = 0;
        row.addEventListener('touchend', function (ev) {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;

            if (tapLength < 400 && tapLength > 0) {
                openModal(i);
                ev.preventDefault();
            }
            lastTap = currentTime;
        });

        list.appendChild(row);
    });
}

async function openModal(index) {
    const file = files[index];
    const modal = document.getElementById('file-modal');
    const contentArea = document.getElementById('modal-content');

    document.getElementById('modal-title').textContent = file.name;
    contentArea.value = "Завантаження...";
    modal.classList.add('active');

    try {
        const text = await file.text();
        contentArea.value = text;
    } catch (e) {
        contentArea.value = "Помилка читання файлу: " + e.message;
    }
}

function closeModal(e) {
    document.getElementById('file-modal').classList.remove('active');
    setTimeout(() => {
        document.getElementById('modal-content').value = '';
    }, 200);
}

async function copyModalContent() {
    const text = document.getElementById('modal-content').value;
    try {
        await navigator.clipboard.writeText(text);
        log('// вміст файлу скопійовано в буфер обміну', 'ok');
        closeModal();
    } catch (err) {
        log('// помилка копіювання в буфер', 'err');
    }
}

async function generate() {
    if (!files.length) {
        log('// додай хоча б один файл', 'err');
        return;
    }

    const btn = document.getElementById('go-btn');
    const prog = document.getElementById('prog');
    btn.disabled = true;
    log('// читаємо файли…', '');

    const sepTpl = document.getElementById('sep').value;
    const gap = '\n'.repeat(Math.max(1, parseInt(document.getElementById('gap').value) || 2));
    const outname = document.getElementById('outname').value || 'combined.txt';

    try {
        const parts = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            prog.style.width = ((i / files.length) * 100) + '%';
            const text = await f.text();
            const sep = sepTpl
                .replace(/{filename}/g, f.name)
                .replace(/{index}/g, String(i + 1))
                .replace(/{ext}/g, getExt(f.name));
            parts.push(sep + '\n\n' + text);
            log(`// обробка: ${f.name} (${i + 1}/${files.length})`, '');
            await new Promise(r => setTimeout(r, 0));
        }

        prog.style.width = '100%';
        const result = parts.join(gap);
        const blob = new Blob([result], {type: 'text/plain;charset=utf-8'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outname;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        const [sz, unit] = fmtSize(new Blob([result]).size);
        log(`// готово! ${files.length} файлів → ${outname} (${sz} ${unit})`, 'ok');
    } catch (e) {
        log('// помилка: ' + e.message, 'err');
    }

    btn.disabled = false;
    setTimeout(() => {
        prog.style.width = '0%';
    }, 2000);
}