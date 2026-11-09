console.log("RUNNING THIS INDEX:", __filename);

const express = require("express");
const cors = require("cors");
const ModbusRTU = require("modbus-serial");

const app = express();
app.use(cors());
app.use(express.json());

const config = {
  host: "0.0.0.0",
  modbusPort: 1502,
  httpPort: 3001,
  unitId: 1,
  holdingSize: 100,
};

const holdingRegisters = new Uint16Array(config.holdingSize);

// Inicjalne wartości
holdingRegisters[0] = 250;
holdingRegisters[1] = 300;

// --- MODBUS TCP SERVER ---
const vector = {
  getHoldingRegister: (addr) => {
    if (addr < 0 || addr >= holdingRegisters.length) return 0;
    return holdingRegisters[addr];
  },

  setRegister: (addr, value) => {
    if (addr < 0 || addr >= holdingRegisters.length) return;
    const v = Math.max(0, Math.min(65535, Number(value) || 0));
    holdingRegisters[addr] = v;
    console.log("MODBUS WRITE:", addr, v);
  },

  getMultipleHoldingRegisters: (addr, length) => {
    const out = [];
    for (let i = 0; i < length; i++) out.push(vector.getHoldingRegister(addr + i));
    return out;
  },

  setMultipleRegisters: (addr, values) => {
    values.forEach((v, i) => vector.setRegister(addr + i, v));
  },
};

const serverTCP = new ModbusRTU.ServerTCP(vector, {
  host: config.host,
  port: config.modbusPort,
  unitID: config.unitId,
  debug: false,
});

serverTCP.on("socketError", (err) => console.error("Modbus socket error:", err));
serverTCP.on("error", (err) => console.error("Modbus server error:", err));

console.log(
  `Modbus TCP server started on ${config.host}:${config.modbusPort} (UnitId=${config.unitId})`
);

// --- REST API ---

app.get("/health", (req, res) => {
  console.log("GET /health");
  res.json({
    status: "ok",
    modbus: { port: config.modbusPort, unitId: config.unitId, holdingSize: config.holdingSize },
  });
});

// Pobierz zakres rejestrów
app.get("/api/holding", (req, res) => {
  console.log("GET /api/holding", req.query);

  const from = Number(req.query.from ?? 0);
  const count = Number(req.query.count ?? 20);

  const f = Math.max(0, Math.min(config.holdingSize - 1, from));
  const c = Math.max(1, Math.min(200, count));
  const end = Math.min(config.holdingSize, f + c);

  const items = [];
  for (let i = f; i < end; i++) {
    items.push({ address: i, value: holdingRegisters[i] });
  }

  console.log("returning", items.length, "items");
  res.json({ from: f, count: items.length, items });
});

// Ustaw pojedynczy rejestr
app.put("/api/holding/:address", (req, res) => {
  const address = Number(req.params.address);
  const value = req.body?.value;

  console.log("PUT /api/holding/:address", { address, value });

  if (!Number.isInteger(address) || address < 0 || address >= config.holdingSize) {
    return res.status(400).json({ error: "Invalid address" });
  }

  vector.setRegister(address, value);
  res.json({ address, value: holdingRegisters[address] });
});

// Ustaw wiele rejestrów naraz
app.put("/api/holding", (req, res) => {
  const updates = req.body?.updates;
  console.log("PUT /api/holding (bulk)", updates?.length ?? 0);

  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: "Body must contain { updates: [{address,value}, ...] }" });
  }

  for (const u of updates) {
    const addr = Number(u.address);
    const val = u.value;
    if (Number.isInteger(addr) && addr >= 0 && addr < config.holdingSize) {
      vector.setRegister(addr, val);
    }
  }

  res.json({ status: "ok" });
});

app.listen(config.httpPort, "0.0.0.0", () => {
  console.log(`HTTP API started on http://127.0.0.1:${config.httpPort}`);
});
