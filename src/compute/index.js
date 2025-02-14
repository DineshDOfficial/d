import { createLibp2p } from "libp2p";
import { tcp } from "@libp2p/tcp";

async function startComputeNode() {
    const computeNode = await createLibp2p({
        transports: [tcp()],
    });

    await computeNode.start();
    console.log("Compute node started with ID:", computeNode.peerId.toString());

    computeNode.handle("/compute-task", async ({ stream }) => {
        let task = "";
        for await (const chunk of stream.source) {
            task += chunk.toString();
        }

        console.log("Executing task:", task);
        const result = eval(task); // Execute task (Replace with sandboxed execution in production)
        console.log("Result:", result);
    });
}

startComputeNode().catch(console.error);
