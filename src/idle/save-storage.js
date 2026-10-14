import { reactive } from 'vue';

export const SAVE_KEY = 'idle-xiuxian-fusion';
const BACKUP_KEY = `${SAVE_KEY}-backup-v1`;
export const saveStatus = reactive({ error: '', savedAt: null, backupAt: null });
const fail = () => { saveStatus.error = '浏览器未能保存进度，请导出存档备份，并检查浏览器存储空间。'; };

export const saveStorage = {
    getItem(key) {
        try { return localStorage.getItem(key); } catch { fail(); return null; }
    },
    setItem(key, value) {
        try {
            localStorage.setItem(key, value);
            if (key === SAVE_KEY) { saveStatus.error = ''; saveStatus.savedAt = Date.now(); }
        } catch { fail(); }
    }
};

export function createBackup(player) {
    try {
        const backup = { version: 1, exportAt: new Date().toISOString(), player: JSON.parse(JSON.stringify(player)) };
        localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
        saveStatus.backupAt = Date.now();
        return true;
    } catch { fail(); return false; }
}

export function readBackup() {
    try {
        const text = localStorage.getItem(BACKUP_KEY);
        if (!text) return null;
        const backup = JSON.parse(text);
        saveStatus.backupAt = Date.parse(backup.exportAt) || null;
        return text;
    } catch { fail(); return null; }
}


const REPORT_KEY = `${SAVE_KEY}-offline-report`;
export function readOfflineReport() {
    try {
        const report = JSON.parse(localStorage.getItem(REPORT_KEY));
        return report && Number.isFinite(report.elapsed) && report.elapsed >= 0 && Number.isFinite(report.spirit) && report.spirit >= 0 ? report : null;
    } catch { return null; }
}
export function rememberOfflineReport(report) {
    if (report) saveStorage.setItem(REPORT_KEY, JSON.stringify(report));
    else { try { localStorage.removeItem(REPORT_KEY); } catch { /* noncritical report */ } }
}
