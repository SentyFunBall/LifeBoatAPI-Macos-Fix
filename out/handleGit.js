"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLibraries = exports.removeSelectedLibrary = exports.addLibraryFromURL = exports.shareSelectedFile = void 0;
const vscode = require("vscode");
const path = require("path");
const util_1 = require("util");
const utils = require("./utils");
const rest_1 = require("@octokit/rest");
const https = require("https");
const terminal_1 = require("./terminal");
function shareSelectedFile(context, file) {
    let selectedFile = file ?? utils.getCurrentWorkspaceFile();
    if (!selectedFile) {
        return vscode.window.showWarningMessage("No file selected to share. Try using right-click menu.");
    }
    let selectedFolder = utils.getContainingFolder(selectedFile);
    if (!selectedFile || !selectedFolder || !utils.isStormworksProject(selectedFolder)) {
        return vscode.window.showWarningMessage("Command can only be run within a Stormworks project");
    }
    let relativePath = utils.relativePath(selectedFile);
    if (!relativePath) {
        return;
    }
    let fileName = path.basename(relativePath);
    return vscode.workspace.fs.readFile(selectedFile).then((fileData) => {
        return new util_1.TextDecoder().decode(fileData);
    }).then((fileContents) => {
        let libConfig = vscode.workspace.getConfiguration("lifeboatapi.stormworks.libs", selectedFolder);
        let existingGists = libConfig.get("sharedGistFiles") ?? [];
        for (let gist of existingGists) {
            if (gist.relativePath === relativePath) {
                if (!gist.isDirty) {
                    vscode.env.clipboard.writeText(gist.gistUrl);
                    return vscode.window.showInformationMessage("Copied " + gist.gistUrl + " to the clipboard for " + relativePath + " ready to share!");
                }
                else {
                    return updateGist(libConfig, existingGists, gist, relativePath, fileName, fileContents);
                }
            }
        }
        // no existing gist found, create a new one
        return createGist(libConfig, existingGists, relativePath ?? "", fileName, fileContents);
    });
}
exports.shareSelectedFile = shareSelectedFile;
function updateGist(libConfig, existingGists, gist, relativePath, fileName, fileContents) {
    return vscode.authentication.getSession("github", ['gist'], { createIfNone: true })
        .then((session) => {
        if (session) {
            // valid github session
            const url = 'https://api.github.com';
            const rejectUnauthorized = true;
            const agent = new https.Agent({ rejectUnauthorized });
            let octokit = new rest_1.Octokit({ auth: session.accessToken });
            let files = {};
            files[fileName] = { content: fileContents };
            let request = {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                gist_id: gist.gistID,
                description: "Stormworks LifeboatAPI - Gist - " + fileName,
                files: files
            };
            return octokit.gists.update(request).then((response) => {
                if ((response.status === 200) && response.data.git_pull_url) {
                    gist.isDirty = false;
                    return libConfig.update("sharedGistFiles", existingGists).then(() => {
                        vscode.env.clipboard.writeText(response.data.git_pull_url ?? "FATAL ERROR");
                        return vscode.window.showInformationMessage("Updated gist, link copied to clipboard: " + response.data.git_pull_url + " for " + relativePath + " ready to share!");
                    });
                }
                else {
                    return vscode.window.showWarningMessage("Gist failed to update, HTTP status code: " + response.status);
                }
            });
        }
        else {
            return vscode.window.showWarningMessage("A github account must be connected in order to update gist's. Please see VSCode user accounts.");
        }
    });
}
function createGist(libConfig, existingGists, relativePath, fileName, fileContents) {
    return vscode.authentication.getSession("github", ['gist'], { createIfNone: true })
        .then((session) => {
        if (session) {
            let octokit = new rest_1.Octokit({ auth: session.accessToken });
            let files = {};
            files[fileName] = { content: fileContents };
            let request = {
                description: "Stormworks LifeboatAPI - Gist - " + fileName,
                files: files,
                public: true
            };
            return octokit.gists.create(request).then((response) => {
                if ((response.status === 201) && response.data.git_pull_url && response.data.id) {
                    existingGists.push({
                        gistUrl: response.data.git_pull_url,
                        relativePath: relativePath,
                        isDirty: false,
                        gistID: response.data.id
                    });
                    return libConfig.update("sharedGistFiles", existingGists).then(() => {
                        vscode.env.clipboard.writeText(response.data.git_pull_url ?? "FATAL ERROR");
                        return vscode.window.showInformationMessage("Created new gist, link copied to clipboard: " + response.data.git_pull_url + " for " + relativePath + " ready to share!");
                    });
                }
                else {
                    return vscode.window.showWarningMessage("Gist failed to create, HTTP status code: " + response.status);
                }
            });
        }
        else {
            return vscode.window.showWarningMessage("A github account must be connected in order to create gist's. Please see VSCode user accounts.");
        }
    });
}
function addLibraryFromURL(context, file) {
    let workspaceFolder;
    if (file) {
        workspaceFolder = utils.getContainingFolder(file);
    }
    else {
        workspaceFolder = utils.getCurrentWorkspaceFolder();
    }
    if (!workspaceFolder || !utils.isStormworksProject(workspaceFolder)) {
        return vscode.window.showWarningMessage("Must have active Stormworks project open, or run from right-click menu.");
    }
    if (!workspaceFolder || !utils.isStormworksProject(workspaceFolder)) {
        return;
    }
    return utils.ensureBuildFolderExists(workspaceFolder)
        .then(() => vscode.window.showInputBox({
        placeHolder: "https//github.com/example_link.git",
        prompt: "Enter the git URL of the library",
        title: "Add Git Library",
        ignoreFocusOut: false
    })
        .then((url) => {
        if (url) {
            let workspaceFolder = utils.getContainingFolder(file);
            if (workspaceFolder) {
                let config = vscode.workspace.getConfiguration("lifeboatapi.stormworks.libs", workspaceFolder);
                let gitLibs = config.get("gitLibraries") ?? [];
                let urlEnding = path.basename(url, ".git");
                let urlUser = path.basename(path.dirname(url));
                let libName = urlEnding;
                if (!urlUser.includes(".")) {
                    libName = urlUser + "/" + urlEnding;
                }
                for (let lib of gitLibs) {
                    if (lib.gitUrl === url) {
                        return vscode.window.showInformationMessage("Library already in project - see settings.json if this is wrong").then();
                    }
                }
                let gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
                if (gitExtension) {
                    let gitPath = gitExtension.getAPI(1).git.path;
                    return terminal_1.TerminalHandler.get().awaitTerminal({
                        cwd: utils.sanitizeFolderPath(workspaceFolder?.uri.fsPath ?? "") + "_build/libs/",
                        shellArgs: ["clone", url, libName],
                        name: "add library",
                        hideFromUser: false,
                        shellPath: gitPath,
                    }).then((terminal) => {
                        if (terminal.exitStatus?.code === 0) {
                            gitLibs.push({ name: libName, gitUrl: url });
                            return config.update("gitLibraries", gitLibs);
                        }
                        else {
                            return vscode.window.showErrorMessage("Git process failed with error code: " + terminal.exitStatus).then(() => { });
                        }
                    });
                }
                else {
                    return vscode.window.showErrorMessage("VSCode git extension may be disabled. Please check your settings and enable vscode.git");
                }
            }
            else {
                return vscode.window.showErrorMessage("Can't add library without a valid SW project selected");
            }
        }
    }));
}
exports.addLibraryFromURL = addLibraryFromURL;
function removeSelectedLibrary(context, file) {
    if (!file) {
        return vscode.window.showWarningMessage("Run this command via right-click menu - no selected file to remove");
    }
    let workspaceFolder = utils.getContainingFolder(file);
    if (!workspaceFolder || !utils.isStormworksProject(workspaceFolder)) {
        return;
    }
    let sanitized = utils.relativePath(file);
    if (sanitized) {
        let config = vscode.workspace.getConfiguration("lifeboatapi.stormworks.libs", workspaceFolder);
        let gitLibs = config.get("gitLibraries") ?? [];
        let libsToDelete = [];
        let libsTokeep = [];
        for (let lib of gitLibs) {
            if (!sanitized.includes("_build/libs/" + lib.name)) {
                libsTokeep.push(lib);
            }
            else {
                libsToDelete.push(lib);
            }
        }
        let promises = [];
        for (let lib of libsToDelete) {
            promises.push(vscode.workspace.fs.delete(vscode.Uri.file(utils.sanitizeFolderPath(workspaceFolder.uri.fsPath) + "_build/libs/" + lib.name), { recursive: true, useTrash: false }));
        }
        Promise.all(promises);
        return config.update("gitLibraries", libsTokeep);
    }
}
exports.removeSelectedLibrary = removeSelectedLibrary;
function updateLibraries(context, file) {
    let workspaceFolder;
    if (file) {
        workspaceFolder = utils.getContainingFolder(file);
    }
    else {
        workspaceFolder = utils.getCurrentWorkspaceFolder();
    }
    if (!workspaceFolder || !utils.isStormworksProject(workspaceFolder)) {
        return vscode.window.showWarningMessage("Must have active Stormworks project open, or run from right-click menu");
    }
    let gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
    utils.ensureBuildFolderExists(workspaceFolder)
        .then(() => {
        let promises = [];
        if (gitExtension && workspaceFolder) {
            let gitPath = gitExtension.getAPI(1).git.path;
            let config = vscode.workspace.getConfiguration("lifeboatapi.stormworks.libs", workspaceFolder);
            let gitLibs = config.get("gitLibraries") ?? [];
            for (let lib of gitLibs) {
                let libPath = utils.sanitizeFolderPath(workspaceFolder?.uri.fsPath ?? "") + "_build/libs/" + lib.name;
                let promise = utils.doesFileExist(vscode.Uri.file(libPath), () => {
                    // update latest
                    return terminal_1.TerminalHandler.get().awaitTerminal({
                        cwd: libPath,
                        shellArgs: ["pull"],
                        name: "update libraries",
                        hideFromUser: false,
                        shellPath: gitPath,
                    }).then((terminal) => {
                        if (terminal.exitStatus?.code !== 0) {
                            return vscode.window.showErrorMessage("Git process failed with error code: " + terminal.exitStatus).then(() => { });
                        }
                    });
                }, () => {
                    return terminal_1.TerminalHandler.get().awaitTerminal({
                        cwd: utils.sanitizeFolderPath(workspaceFolder?.uri.fsPath ?? "") + "_build/libs/",
                        shellArgs: ["clone", lib.gitUrl, lib.name],
                        name: "clone missing lib",
                        hideFromUser: false,
                        shellPath: gitPath,
                    }).then((terminal) => {
                        if (terminal.exitStatus?.code !== 0) {
                            return vscode.window.showErrorMessage("Git process failed with error code: " + terminal.exitStatus).then(() => { });
                        }
                    });
                });
                promises.push(promise);
            }
        }
        else if (!gitExtension) {
            promises.push(vscode.window.showWarningMessage("VSCode git extension may be disabled. Please check your settings and enable vscode.git"));
        }
        else {
            promises.push(vscode.window.showErrorMessage("Unexpected error while updating libraries"));
        }
        return Promise.all(promises);
    });
}
exports.updateLibraries = updateLibraries;
//# sourceMappingURL=handleGit.js.map