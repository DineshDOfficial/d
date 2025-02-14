const express = require("express");
const multer = require("multer");
const { create } = require("ipfs-core");

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

let ipfsNode; // IPFS instance

// Initialize IPFS
(async () => {
    ipfsNode = await create();
    console.log("IPFS node started");
})();

// Upload file to IPFS
app.post("/upload", upload.single("file"), async (req, res) => {
    if (!ipfsNode) return res.status(500).json({ error: "IPFS not ready" });

    const { buffer } = req.file;
    const { cid } = await ipfsNode.add(buffer);
    console.log(`File uploaded to IPFS with CID: ${cid.toString()}`);

    res.json({ message: "File stored", cid: cid.toString() });
});

// Retrieve file from IPFS
app.get("/file/:cid", async (req, res) => {
    if (!ipfsNode) return res.status(500).json({ error: "IPFS not ready" });

    try {
        const stream = ipfsNode.cat(req.params.cid);
        res.setHeader("Content-Type", "application/octet-stream");
        
        for await (const chunk of stream) {
            res.write(chunk);
        }
        res.end();
    } catch (error) {
        res.status(404).json({ error: "File not found" });
    }
});

app.listen(4003, () => console.log("Storage service running on port 4003"));
