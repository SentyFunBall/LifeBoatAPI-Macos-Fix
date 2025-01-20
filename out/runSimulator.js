"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.beginSimulator = void 0;
const vscode = require("vscode");
const path = require("path");
const util_1 = require("util");
const utils = require("./utils");
const projectCreation = require("./projectCreation");
const settingsManagement = require("./settingsManagement");
function generateSimulatorLua(workspaceFolder, fileToSimulate) {
    // turn the relative path into a lua require
    let relativePath = utils.strReplaceAll(fileToSimulate.fsPath, workspaceFolder.fsPath, "");
    relativePath = utils.strReplaceAll(relativePath, path.extname(relativePath), "");
    relativePath = utils.strReplaceAll(relativePath, "\\", "/");
    relativePath = utils.strReplaceAll(relativePath, "//", "/");
    relativePath = utils.strReplaceAll(relativePath, "/", ".");
    if (relativePath.substr(0, 1) === ".") // remove initial "." that might be left
     {
        relativePath = relativePath.substr(1);
    }
    // is that correct?
    // or do we need to do something else?
    let contents = `
require("LifeBoatAPI.Tools.Simulator.Simulator")
require("LifeBoatAPI.Tools.Simulator.SimulatorSandbox")

-- command line input
for k,v in pairs(arg) do
    arg[k] = v:gsub("##LBNEWLINE##", "\\n")
end

local rootDirs = {};
for i=3, #arg do
    rootDirs[#rootDirs+1] = LifeBoatAPI.Tools.Filepath:new(arg[i])
end

-- simulator
local sandboxEnv = LifeBoatAPI.Tools.SimulatorSandbox.createSandbox(rootDirs)
local simulator = LifeBoatAPI.Tools.Simulator:new(sandboxEnv)
sandboxEnv.simulator = simulator
simulator:_beginSimulation(false, arg[1], arg[2])

-- main require
sandboxEnv.require("${relativePath}")

simulator:_giveControlToMainLoop()
`;
    return projectCreation.addBoilerplate(contents);
}
function beginSimulator(context) {
    let workspace = utils.getCurrentWorkspaceFolder();
    let file = utils.getCurrentWorkspaceFile();
    if (!file || !workspace || !utils.isStormworksProject(workspace)) {
        return;
    }
    if (!vscode.debug.activeDebugSession) // avoid running two debug sessions at once, easy to do as it's F6 to start
     {
        let simulatorLua = generateSimulatorLua(workspace.uri, file);
        let simulatedLuaFile = vscode.Uri.file(workspace.uri.fsPath + "/_build/_simulator.lua");
        // load the path and cpath, this means if the settings file is wrong - at least the simulator works
        // although the lua-debug probably won't. It shouldn't be needed, but it will make life a bit more stable.
        let path = settingsManagement.getDebugPaths(context, workspace);
        path.push(utils.sanitizeFolderPath(workspace.uri.fsPath) + "?.lua");
        return vscode.workspace.fs.writeFile(simulatedLuaFile, new util_1.TextEncoder().encode(simulatorLua))
            .then(() => {
            let config = {
                name: "Run Simulator",
                type: "lua",
                request: "launch",
                program: `${simulatedLuaFile?.fsPath}`,
                stopOnEntry: false,
                stopOnThreadEntry: false,
                luaVersion: "5.3",
                luaArch: "x86",
                path: path.join(";"),
                cpath: settingsManagement.getDebugCPaths(context),
                arg: [
                    utils.sanitizeFolderPath(context.extensionPath) + "assets/simulator/STORMWORKS_Simulator.exe",
                    utils.sanitizeFolderPath(workspace?.uri.fsPath ?? "") + "_build/_debug_simulator_log.txt"
                ]
            };
            // add library paths
            const libPaths = settingsManagement.getLibraryPaths(context, utils.getCurrentWorkspaceFolder());
            for (let dir of libPaths) {
                config.arg.push(dir);
            }
            // replace all newlines with ##LBNEWLINE## to be unpacked on the recieving end
            config.arg.forEach(function (val, index, arr) {
                arr[index] = utils.strReplaceAll(val, "\r\n", "##LBNEWLINE##");
                arr[index] = utils.strReplaceAll(arr[index], "\n", "##LBNEWLINE##");
            });
            // todo, set the debugger setting here, it doesn't look like it reads it from above?
            return vscode.debug.startDebugging(workspace, config);
        });
    }
    else {
        return Promise.reject("Please end current debug session before starting another.");
    }
}
exports.beginSimulator = beginSimulator;
//# sourceMappingURL=runSimulator.js.map