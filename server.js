import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { parse } from "url";

const port = process.env.PORT || 3000;

let clients = [];

function broadcastDonation(donation) {
  const payload = JSON.stringify(donation);
  clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(payload);
    }
  });
}

const server = createServer((req, res) => {
  const { pathname } = parse(req.url, true);

  if (pathname === "/api/broadcast" && req.method === "POST") {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        const donation = JSON.parse(body);
        broadcastDonation(donation);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Broadcast successful" }));
      } catch (e) {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Invalid JSON" }));
      }
    });
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ message: "Not Found" }));
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (ws) => {
  clients.push(ws);

  ws.on("close", () => {
    clients = clients.filter((c) => c !== ws);
  });
});

server.on("upgrade", (request, socket, head) => {
  const { pathname } = parse(request.url, true);

  if (pathname === "/ws/donations") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, () => {
  console.log(`WebSocket server running on port ${port}`);
});
