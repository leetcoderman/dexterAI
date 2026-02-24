import { ipcMain, dialog } from 'electron';
import { basename } from 'path';

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
}
