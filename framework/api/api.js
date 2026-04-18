import express from "express";

import componentAPI from "./accomplishments/componentAPI.js";
import configAPI from "./accomplishments/configAPI.js";

/**
 * Sewepo API框架
 */

const router = express.Router();

router.use("/component", componentAPI);
router.use("/config", configAPI);

export default router;