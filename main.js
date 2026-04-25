import Logger from "./framework/logger.js";
import initalizer from "./framework/initalizer.js";
import configHandler from "./framework/configHandler.js";
import api from "./framework/api/api.js";
import path from "path";

import express from "express";

Logger.info("FRAME", "开始初始化");
await initalizer.init();

Logger.info("FRAME", "初始化完成");
const app = express();
const config = configHandler.getConfig();
const port = config.ServicePort || 8080;

const staticRoot = path.join(import.meta.dirname, "framework", "statics");
const componentsRoot = path.join(import.meta.dirname, "Components");

app.use(express.static(staticRoot));
app.use("/Components", express.static(componentsRoot));

app.use("/api", api);

app.listen(port, () => {
    Logger.info("FRAME", `服务已启动，监听端口 ${port}`);
});

app.get('/', (req, res) => {
    res.redirect("/index/index.html");
})