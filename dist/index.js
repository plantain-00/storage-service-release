"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const express_1 = tslib_1.__importDefault(require("express"));
const minimist_1 = tslib_1.__importDefault(require("minimist"));
const body_parser_1 = tslib_1.__importDefault(require("body-parser"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const path_1 = tslib_1.__importDefault(require("path"));
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
app.use(body_parser_1.default.json());
app.use((_, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    next();
});
app.get('/:key', (req, res) => {
    const filePath = path_1.default.resolve(filesPath, req.params.key);
    fs_1.default.stat(filePath, (error) => {
        if (error) {
            res.status(404);
            res.end(error.message);
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(fs_1.default.readFileSync(filePath));
        }
    });
});
app.post('/:key', (req, res) => {
    const filePath = path_1.default.resolve(filesPath, req.params.key);
    fs_1.default.writeFile(filePath, JSON.stringify(req.body), (error) => {
        if (error) {
            res.status(400);
            res.end(error.message);
        }
        else {
            res.setHeader('Content-Type', 'application/json');
            res.send(fs_1.default.readFileSync(filePath));
        }
    });
});
app.listen(port, host, () => {
    console.log(`storage service is listening: ${host}:${port}`);
});
process.on('SIGINT', () => {
    process.exit();
});
process.on('SIGTERM', () => {
    process.exit();
});
