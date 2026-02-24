import { ipcMain } from 'electron';
import { getDatabase } from '../db/database';

export function registerTemplateHandlers() {
    ipcMain.handle('templates:list', async (_, category: string) => {
        try {
            const db = getDatabase();
            const rows = db.prepare('SELECT * FROM prompt_templates WHERE category = ? ORDER BY name ASC').all(category);
            return rows;
        } catch (err: any) {
            console.error('templates:list error', err);
            return [];
        }
    });

    ipcMain.handle('templates:save', async (_, template: any) => {
        try {
            const db = getDatabase();
            const now = Date.now();
            const stmt = db.prepare(`
                INSERT INTO prompt_templates(id, name, category, params_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            const id = template.id || `tpl_${Date.now()}`;
            stmt.run(
                id,
                template.name,
                template.category,
                template.params_json,
                now,
                now
            );
            return { success: true, id };
        } catch (err: any) {
            console.error('templates:save error', err);
            return { success: false, error: err.message };
        }
    });

    ipcMain.handle('templates:delete', async (_, id: string) => {
        try {
            const db = getDatabase();
            db.prepare('DELETE FROM prompt_templates WHERE id = ?').run(id);
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message };
        }
    });
}
