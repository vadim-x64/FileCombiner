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

function loadData() {
    try {
        const settings = JSON.parse(localStorage.getItem('fc_settings'));
        if (settings) {
            document.getElementById('sep').value = settings.sep !== undefined ? settings.sep : "// ===== {filename} =====";
            document.getElementById('gap').value = settings.gap !== undefined ? settings.gap : "2";
            document.getElementById('outname').value = settings.outname !== undefined ? settings.outname : "combined.txt";
        }

        const savedFiles = JSON.parse(localStorage.getItem('fc_files'));
        if (savedFiles && Array.isArray(savedFiles)) {
            files = savedFiles;
            render();
            if (files.length > 0) log(`// відновлено ${files.length} файл(ів) з попередньої сесії`, 'ok');
        }
    } catch (e) {
        console.warn("Помилка завантаження даних", e);
    }
}

function saveData() {
    const settings = {
        sep: document.getElementById('sep').value,
        gap: document.getElementById('gap').value,
        outname: document.getElementById('outname').value
    };
    try {
        localStorage.setItem('fc_settings', JSON.stringify(settings));
        localStorage.setItem('fc_files', JSON.stringify(files));
    } catch (e) {
        console.warn("Не вдалося зберегти файли в localStorage", e);
        log('// Увага: об\'єм файлів завеликий для збереження між сесіями!', 'warn');
    }
}

document.getElementById('sep').addEventListener('input', saveData);
document.getElementById('gap').addEventListener('input', saveData);
document.getElementById('outname').addEventListener('input', saveData);
document.addEventListener('DOMContentLoaded', loadData);

document.querySelectorAll('input[name="format"]').forEach(radio => {
    radio.addEventListener('change', function () {
        const btn = document.getElementById('go-btn');
        btn.textContent = `Зібрати в .${this.value}`;
    });
});

const words = [
    " file_combiner ",
    " merge your files ",
    " no limits "
];

let wordIndex = 0;
let charIndex = 0;
let isDeleting = false;

function typeEffect() {
    const el = document.getElementById("typing-title");
    const currentWord = words[wordIndex];

    if (!isDeleting) {
        el.textContent = currentWord.substring(0, charIndex++);
    } else {
        el.textContent = currentWord.substring(0, charIndex--);
    }

    let speed = isDeleting ? 50 : 100;

    if (!isDeleting && charIndex === currentWord.length) {
        speed = 1500;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        wordIndex = (wordIndex + 1) % words.length;
        speed = 100;
    }

    setTimeout(typeEffect, speed);
}

document.addEventListener("DOMContentLoaded", () => {
    typeEffect();
});

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

dropZone.addEventListener('drop', async e => {
    e.preventDefault();
    dropZone.classList.remove('over');
    await processNewFiles([...e.dataTransfer.files]);
});

fileInput.addEventListener('change', async () => {
    await processNewFiles([...fileInput.files]);
    fileInput.value = '';
});

document.addEventListener('paste', async e => {
    if (e.clipboardData && e.clipboardData.files.length > 0) {
        e.preventDefault();
        await processNewFiles([...e.clipboardData.files]);
    } else if (e.clipboardData) {
        const text = e.clipboardData.getData('text');
        if (text && text.trim().length > 0) {
            e.preventDefault();
            const now = new Date();
            const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
            const newFile = {
                name: `clipboard_${timeStr}.txt`,
                size: new Blob([text]).size,
                content: text
            };
            addProcessedFiles([newFile]);
        }
    }
});

async function processNewFiles(rawFiles) {
    log('// читаємо файли...', '');
    const processed = [];
    for (const f of rawFiles) {
        try {
            const text = await f.text();
            processed.push({
                name: f.name,
                size: f.size,
                content: text
            });
        } catch (e) {
            console.error("Помилка читання файлу:", f.name);
        }
    }
    addProcessedFiles(processed);
}

function addProcessedFiles(newFiles) {
    const dupes = [];
    const added = [];
    const updated = [];
    newFiles.forEach(f => {
        const existingIdx = files.findIndex(x => x.name === f.name);
        if (existingIdx !== -1) {
            if (files[existingIdx].content === f.content) {
                dupes.push(f.name);
            } else {
                files[existingIdx] = f;
                updated.push(f.name);
            }
        } else {
            files.push(f);
            added.push(f.name);
        }
    });
    render();
    saveData();

    const parts = [];
    if (added.length) parts.push(`додано ${added.length} файл(ів)`);
    if (updated.length) parts.push(`оновлено ${updated.length} файл(ів): ${updated.join(', ')}`);
    if (dupes.length) parts.push(`без змін (пропущено): ${dupes.join(', ')}`);

    if (updated.length || added.length) {
        log(`// ${parts.join(' | ')}. Всього: ${files.length}`, updated.length ? 'warn' : 'ok');
    } else {
        log(`// помилка: всі ці файли вже актуальні — ${dupes.join(', ')}`, 'err');
    }
}

function removeFile(i) {
    files.splice(i, 1);
    render();
    saveData();
}

function clearAll() {
    files = [];
    render();
    saveData();
    log('// список очищено', '');
}

function sortFiles() {
    files.sort((a, b) => a.name.localeCompare(b.name));
    render();
    saveData();
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
            saveData();
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

function openModal(index) {
    const file = files[index];
    const modal = document.getElementById('file-modal');
    const contentArea = document.getElementById('modal-content');

    document.getElementById('modal-title').textContent = file.name;
    contentArea.value = file.content;
    modal.classList.add('active');
}

function closeModal(e) {
    document.getElementById('file-modal').classList.remove('active');
    setTimeout(() => {
        document.getElementById('modal-content').value = '';
    }, 200);
}

let copyBtnTimeout = null;

async function copyModalContent() {
    const text = document.getElementById('modal-content').value;
    const copyBtn = document.getElementById('copy-modal-btn');

    try {
        await navigator.clipboard.writeText(text);
        log('// вміст файлу скопійовано в буфер обміну', 'ok');

        if (copyBtn) {
            clearTimeout(copyBtnTimeout);
            copyBtn.disabled = true;
            copyBtn.innerHTML = '✓ Скопійовано';

            copyBtnTimeout = setTimeout(() => {
                copyBtn.disabled = false;
                copyBtn.textContent = 'Копіювати текст';
            }, 1400);
        }
    } catch (err) {
        log('// помилка копіювання в буфер', 'err');
    }
}

function buildDocxParagraphs(text) {
    const lines = text.replace(/\t/g, '    ').split('\n');

    return lines.map(line => new window.docx.Paragraph({
        spacing: {
            before: 0,
            after: 0,
            line: 240
        },
        children: [
            new window.docx.TextRun({
                text: line.length ? line : ' ',
                font: 'Courier New',
                size: 20
            })
        ]
    }));
}

async function generate() {
    if (!files.length) {
        log('// додай хоча б один файл', 'err');
        return;
    }

    const btn = document.getElementById('go-btn');
    const prog = document.getElementById('prog');
    btn.disabled = true;
    log('// збираємо файли…', '');

    const sepTpl = document.getElementById('sep').value;
    const gap = '\n'.repeat(Math.max(1, parseInt(document.getElementById('gap').value) || 2));
    const format = document.querySelector('input[name="format"]:checked').value;
    let outname = document.getElementById('outname').value || `combined.${format}`;

    if (!outname.endsWith(`.${format}`)) {
        outname = outname.replace(/\.\w+$/, '') + `.${format}`;
    }

    try {
        const parts = [];
        for (let i = 0; i < files.length; i++) {
            const f = files[i];
            prog.style.width = ((i / files.length) * 100) + '%';

            const text = f.content;

            const sep = sepTpl
                .replace(/{filename}/g, f.name)
                .replace(/{index}/g, String(i + 1))
                .replace(/{ext}/g, getExt(f.name));
            parts.push(sep + '\n\n' + text);
            log(`// обробка: ${f.name} (${i + 1}/${files.length})`, '');

            await new Promise(r => setTimeout(r, 10));
        }

        prog.style.width = '100%';
        const result = parts.join(gap);

        if (format === 'txt') {
            const blob = new Blob([result], {type: 'text/plain;charset=utf-8'});
            downloadBlob(blob, outname);
        } else if (format === 'pdf') {
            const {jsPDF} = window.jspdf;
            const doc = new jsPDF();
            const lines = doc.splitTextToSize(result, 180);
            doc.text(lines, 10, 10);
            doc.save(outname);
        } else if (format === 'docx') {
            const doc = new window.docx.Document({
                sections: [{
                    properties: {},
                    children: buildDocxParagraphs(result)
                }]
            });

            const blob = await window.docx.Packer.toBlob(doc);
            downloadBlob(blob, outname);
        }

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

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}