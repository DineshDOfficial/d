import { createLibp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";

async function startNode() {
    const node = await createLibp2p({
        transports: [tcp()],
    });

    await node.start();
    console.log("Node started with ID:", node.peerId.toString());

    node.addEventListener("peer:connect", (event) => {
        console.log("Connected to:", event.detail.toString());
    });
}

startNode().catch(console.error);