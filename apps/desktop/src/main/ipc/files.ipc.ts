import { ipcMain, dialog } from 'electron';
import { basename } from 'path';
import { writeFile } from 'fs/promises';

export function registerFileHandlers() {
    ipcMain.handle('files:openAudioPicker', async () => {
        const result = await dialog.showOpenDialog({
            title: 'Select Audio File',
            filters: [
                { name: 'Audio Files', extensions: ['wav', 'mp3', 'm4a', 'flac', 'ogg', 'webm', 'aac'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) return null;
        const filePath = result.filePaths[0];
        return { path: filePath, name: basename(filePath) };
    });

    ipcMain.handle('files:saveFile', async (_, { content, title, defaultName, filters }: {
        content: string | Buffer | Uint8Array;
        title: string;
        defaultName: string;
        filters: Electron.FileFilter[];
    }) => {
        const { canceled, filePath } = await dialog.showSaveDialog({
            title,
            defaultPath: defaultName,
            filters
        });

        if (canceled || !filePath) return { success: false };

        try {
            // If content is a base64 string (sometimes common for blobs), convert to buffer
            let data: string | Buffer | Uint8Array = content;
            if (typeof content === 'string' && content.startsWith('data:')) {
                const base64Data = content.split(',')[1];
                data = Buffer.from(base64Data, 'base64');
            }

            await writeFile(filePath, data);
            return { success: true, filePath };
        } catch (error: any) {
            console.error('Failed to save file:', error);
            return { success: false, error: error.message };
        }
    });
}
