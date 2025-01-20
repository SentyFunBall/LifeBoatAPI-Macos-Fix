"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLuaLibraryPaths = exports.getDebugCPaths = exports.getDebugPaths = exports.getLibraryPaths = void 0;
const vscode = require("vscode");
const utils = require("./utils");
function getLibraryPaths(context, folder) {
    let lifeboatConfig = vscode.workspace.getConfiguration("lifeboatapi.stormworks.libs", folder);
    let libraryPaths = lifeboatConfig.get("libraryPaths") ?? [];
    // sanitized library paths from settings
    let uniquePaths = new Set();
    // current workspace
    uniquePaths.add(utils.sanitizeFolderPath(folder?.uri.fsPath ?? ""));
    // default extension paths
    uniquePaths.add(utils.sanitizeFolderPath(context.extensionPath) + "assets/lua/Common/");
    if (utils.isMicrocontrollerProject(folder)) {
        uniquePaths.add(utils.sanitizeFolderPath(context.extensionPath) + "assets/lua/Microcontroller/");
    }
    else {
        uniquePaths.add(utils.sanitizeFolderPath(context.extensionPath) + "assets/lua/Addon/");
    }
    // hardcoded user paths
    for (let path of libraryPaths) {
        uniquePaths.add(utils.sanitizeFolderPath(path));
    }
    // lastly, git library paths
    uniquePaths.add(utils.sanitizeFolderPath(folder?.uri.fsPath ?? "") + "_build/libs/");
    return Array.from(uniquePaths);
}
exports.getLibraryPaths = getLibraryPaths;
function getDebugPaths(context, folder) {
    let debugPaths = [
        utils.sanitizeFolderPath(context.extensionPath) + "assets/luasocket/?.lua",
    ];
    for (let path of getLibraryPaths(context, folder)) {
        debugPaths.push(path + "?.lua"); // irritating difference between how the debugger and the intellisense check paths
        debugPaths.push(path + "?.luah"); // "hidden" lua that will run, but not appear in intellisense
        debugPaths.push(path + "?/init.lua"); // library initializers
    }
    return debugPaths;
}
exports.getDebugPaths = getDebugPaths;
function getDebugCPaths(context) {
    // no user-defined cpaths allowed, as it opens up people including and using dangerous dlls very easily
    const defaultCPaths = [
        utils.sanitizeFolderPath(context.extensionPath) + "assets/luasocket/dll/socket/core.dll",
        utils.sanitizeFolderPath(context.extensionPath) + "assets/luasocket/dll/mime/core.dll",
    ];
    return defaultCPaths.join(";");
}
exports.getDebugCPaths = getDebugCPaths;
function updateLuaLibraryPaths(context, folder) {
    return Promise.resolve().then(() => {
        let luaLibWorkspace = vscode.workspace.getConfiguration("Lua.workspace", folder);
        return luaLibWorkspace.update("library", getLibraryPaths(context, folder), vscode.ConfigurationTarget.WorkspaceFolder);
    });
}
exports.updateLuaLibraryPaths = updateLuaLibraryPaths;
//# sourceMappingURL=settingsManagement.js.map