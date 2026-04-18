import Logger from "./framework/logger.js";
import initalizer from "./framework/initalizer.js";
import configHandler from "./framework/configHandler.js";
import api from "./framework/api/api.js";

import express from "express";

Logger.info("FRAME", "开始初始化");
await initalizer.init();

Logger.info("FRAME", "初始化完成");
const app = express();
const config = configHandler.getConfig();
const port = config.ServicePort || 8080;

app.use(express.static("./framework/statics"));
app.use("/Components", express.static("./Components"));

app.use("/api", api);

app.listen(port, () => {
    Logger.info("FRAME", `服务已启动，监听端口 ${port}`);
});

app.get('/', (req, res) => {
    res.redirect("/index/index.html");
})