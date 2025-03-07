import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
    res.send("Chat API is running...");
});

export default router;