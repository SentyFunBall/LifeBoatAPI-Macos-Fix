"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.doesFileExist = exports.isStormworksProject = exports.isMicrocontrollerProject = exports.getCurrentWorkspaceFolder = exports.getCurrentWorkspaceFile = exports.sanitizeFilePath = exports.sanitizeFolderPath = exports.ensureBuildFolderExists = exports.getContainingFolder = exports.relativePath = exports.strReplaceAll = void 0;
const vscode = require("vscode");
function strReplaceAll(str, searchValue, replacement) {
    let current = String(str);
    let changed = String(str);
    do {
        current = changed;
        changed = current.replace(searchValue, replacement);
    } while (current !== changed);
    return current;
}
exports.strReplaceAll = strReplaceAll;
;
function relativePath(file) {
    let folder = getContainingFolder(file);
    if (folder) {
        let fileSanitized = sanitizeFilePath(file.fsPath);
        let folderSanitized = sanitizeFolderPath(folder.uri.fsPath);
        let relative = sanitizeFolderPath(fileSanitized.replace(folderSanitized, ""));
        return relative;
    }
    // is not a child of any of the workspace folders
    return undefined;
}
exports.relativePath = relativePath;
function getContainingFolder(file) {
    return vscode.workspace.getWorkspaceFolder(file);
}
exports.getContainingFolder = getContainingFolder;
function ensureBuildFolderExists(folder) {
    return vscode.workspace.fs.createDirectory(vscode.Uri.file(sanitizeFolderPath(folder?.uri.fsPath ?? "") + "_build/libs/"));
}
exports.ensureBuildFolderExists = ensureBuildFolderExists;
function sanitizeFolderPath(resourcePath) {
    resourcePath = strReplaceAll(resourcePath, "\\", "/");
    if (resourcePath.charAt(resourcePath.length - 1) !== "/") {
        return resourcePath + "/";
    }
    return resourcePath;
}
exports.sanitizeFolderPath = sanitizeFolderPath;
function sanitizeFilePath(resourcePath) {
    resourcePath = strReplaceAll(resourcePath, "\\", "/");
    return resourcePath;
}
exports.sanitizeFilePath = sanitizeFilePath;
function getCurrentWorkspaceFile() {
    return vscode.window.activeTextEditor?.document.uri;
}
exports.getCurrentWorkspaceFile = getCurrentWorkspaceFile;
function getCurrentWorkspaceFolder() {
    const currentFile = getCurrentWorkspaceFile();
    if (currentFile) {
        return vscode.workspace.getWorkspaceFolder(currentFile);
    }
    return undefined;
}
exports.getCurrentWorkspaceFolder = getCurrentWorkspaceFolder;
function isMicrocontrollerProject(folder) {
    if (folder) {
        let lifeboatConfig = vscode.workspace.getConfiguration("lifeboatapi.stormworks", folder);
        return lifeboatConfig.get("isMicrocontrollerProject") ?? false;
    }
    return false;
}
exports.isMicrocontrollerProject = isMicrocontrollerProject;
function isStormworksProject(folder) {
    if (folder) {
        let lifeboatConfig = vscode.workspace.getConfiguration("lifeboatapi.stormworks", folder);
        return lifeboatConfig.get("isAddonProject") || lifeboatConfig.get("isMicrocontrollerProject");
    }
    return false;
}
exports.isStormworksProject = isStormworksProject;
function doesFileExist(path, onExists, onNotExist) {
    return vscode.workspace.fs.stat(path)
        .then(() => {
        return onExists();
    }, (err) => {
        return onNotExist();
    });
}
exports.doesFileExist = doesFileExist;
//# sourceMappingURL=utils.js.map