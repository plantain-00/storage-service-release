"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const minimist_1 = tslib_1.__importDefault(require("minimist"));
const body_parser_1 = tslib_1.__importDefault(require("body-parser"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
const jsonpatch = tslib_1.__importStar(require("fast-json-patch"));
const util = tslib_1.__importStar(require("util"));
const http = tslib_1.__importStar(require("http"));
const WebSocket = tslib_1.__importStar(require("ws"));
const qs = tslib_1.__importStar(require("querystring"));
const url = tslib_1.__importStar(require("url"));
const server = http.createServer();
const wss = new WebSocket.Server({ server });
const app = express_1.default();
const argv = minimist_1.default(process.argv.slice(2));
const port = argv.p || 9245;
const host = argv.h || 'localhost';
const filesPath = path_1.default.resolve(__dirname, '../files');
try {
    fs_1.default.mkdirSync(filesPath);
}
catch {
    // do nothing
}
const readFileAsync = util.promisify(fs_1.default.readFile);
const writeFileAsync = util.promisify(fs_1.default.writeFile);
const statAsync = util.promisify(fs_1.default.stat);
app.use(body_parser_1.default.json());
app.use((_, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.get('/:key', async (req, res) => {
    try {
        const filePath = path_1.default.resolve(filesPath, req.params.key);
        await statAsync(filePath);
        res.setHeader('Content-Type', 'application/json');
        res.send(await readFileAsync(filePath));
    }
    catch (error) {
        res.status(404);
        res.end(error.message);
    }
});
app.post('/:key', async (req, res) => {
    try {
        const filePath = path_1.default.resolve(filesPath, req.params.key);
        await writeFileAsync(filePath, JSON.stringify(req.body));
        res.setHeader('Content-Type', 'application/json');
        res.send(await readFileAsync(filePath));
    }
    catch (error) {
        res.status(400);
        res.end(error.message);
    }
});
const connections = [];
async function patch(key, operations) {
    const filePath = path_1.default.resolve(filesPath, key);
    const data = await readFileAsync(filePath);
    const json = JSON.parse(data.toString());
    const newJson = jsonpatch.applyPatch(json, operations).newDocument;
    await writeFileAsync(filePath, JSON.stringify(newJson));
    return newJson;
}
app.patch('/:key', async (req, res) => {
    try {
        const key = req.params.key;
        const operations = req.body;
        const newJson = await patch(key, operations);
        for (const connection of connections) {
            if (connection.key === key) {
                connection.ws.send(JSON.stringify(operations));
            }
        }
        res.json(newJson).end();
    }
    catch (error) {
        res.status(400);
        res.end(error.message);
    }
});
wss.on('connection', (ws, req) => {
    if (req.url) {
        const query = url.parse(req.url).query;
        if (query) {
            const key = qs.parse(query).key;
            if (key && typeof key === 'string') {
                connections.push({ key, ws: ws });
                ws.on('close', () => {
                    const index = connections.findIndex((c) => c.ws === ws);
                    if (index >= 0) {
                        connections.splice(index, 1);
                    }
                });
                ws.on('message', async (data) => {
                    if (typeof data === 'string') {
                        const json = JSON.parse(data);
                        if (json.method === 'patch') {
                            await patch(key, json.operations);
                        }
                    }
                    for (const connection of connections) {
                        if (connection.key === key && connection.ws !== ws) {
                            connection.ws.send(data);
                        }
                    }
                });
            }
        }
    }
});
server.on('request', app);
server.listen(port, host, () => {
    console.log(`storage service is listening: ${host}:${port}`);
});
process.on('SIGINT', () => {
    process.exit();
});
process.on('SIGTERM', () => {
    process.exit();
});
