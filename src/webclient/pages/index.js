import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import SimplePeer from "simple-peer";

export default function Home() {
    const [messageInput, setMessageInput] = useState("");
    const [socket, setSocket] = useState(null);
    const [peerId, setPeerId] = useState("Waiting for ID...");
    const [connectedPeers, setConnectedPeers] = useState([]);
    const [messages, setMessages] = useState([]);
    const peersRef = useRef({});

    useEffect(() => {
        const newSocket = io("http://localhost:4001");
        setSocket(newSocket);

        newSocket.on("peer-id", (id) => {
            console.log("Your Peer ID:", id);
            setPeerId(id);
        });

        newSocket.on("active-peers", (peers) => {
            console.log("Active peers:", peers);
            setConnectedPeers(peers);
            peers.forEach((peerId) => initiateConnection(peerId, true, newSocket));
        });

        newSocket.on("new-peer", (newPeerId) => {
            console.log("New peer discovered:", newPeerId);
            setConnectedPeers((prev) => [...prev, newPeerId]);
            initiateConnection(newPeerId, true, newSocket);
        });

        newSocket.on("signal", ({ from, signal }) => {
            if (!peersRef.current[from]) {
                initiateConnection(from, false, newSocket);
            }

            try {
                peersRef.current[from].signal(signal);
            } catch (error) {
                console.error(`Error processing signal from ${from}:`, error);
            }
        });

        newSocket.on("peer-disconnected", (disconnectedPeer) => {
            console.log("Peer disconnected:", disconnectedPeer);
            setConnectedPeers((prev) => prev.filter((id) => id !== disconnectedPeer));

            if (peersRef.current[disconnectedPeer]) {
                peersRef.current[disconnectedPeer].destroy();
                delete peersRef.current[disconnectedPeer];
            }
        });

        return () => newSocket.disconnect();
    }, []);

    const initiateConnection = (peerId, initiator, socketInstance) => {
        if (!socketInstance) {
            console.error("Socket not initialized yet. Retrying...");
            setTimeout(() => initiateConnection(peerId, initiator, socket), 500);
            return;
        }

        if (peersRef.current[peerId]) return;

        const peer = new SimplePeer({ initiator, trickle: false });

        peer.on("signal", (data) => {
            console.log(`Sending signal to ${peerId}`);
            socketInstance.emit("signal", { to: peerId, signal: data });
        });

        peer.on("connect", () => {
            console.log(`Connected to ${peerId}`);
        });

        peer.on("data", (data) => {
            console.log(`Message from ${peerId}:`, data.toString());
            setMessages((prev) => [...prev, `From ${peerId}: ${data.toString()}`]);
        });

        peer.on("error", (err) => {
            console.error(`WebRTC error with ${peerId}:`, err);
        });

        peersRef.current[peerId] = peer;
    };

    const sendMessage = () => {
        if (!messageInput.trim()) return;

        Object.values(peersRef.current).forEach((peer) => {
            if (peer.connected) {
                try {
                    peer.send(messageInput);
                    setMessages((prev) => [...prev, `You: ${messageInput}`]);
                } catch (err) {
                    console.error("Error sending message:", err);
                }
            } else {
                console.warn(`Message not sent, peer not connected.`);
            }
        });

        setMessageInput("");
    };

    return (
        <div>
            <h1>Decentralized Chat</h1>
            <h2>Your Peer ID: {peerId}</h2>

            <h3>Connected Peers:</h3>
            <ul>
                {connectedPeers.map((id) => (
                    <li key={id}>{id}</li>
                ))}
            </ul>

            <div>
                {messages.map((msg, index) => (
                    <p key={index}>{msg}</p>
                ))}
            </div>

            <input
                type="text"
                placeholder="Type a message"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                }}
            />
        </div>
    );
}
