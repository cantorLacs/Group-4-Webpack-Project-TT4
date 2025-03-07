const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");
const multer = require("multer");
const path = require("path");

const app = express();
const port = 3000;

const dbConfig = {
  host: "localhost",
  user: "in-class-user",
  password: "123456",
  database: "in-class-db",
  port: 3306,
};

app.use(cors());
app.use(express.json());

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '../App/images/'); // Folder where images will be stored
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // file name
  }
});

const upload = multer({ storage });

// First endpoint
app.get("/", (req, res) => {
  res.status(200).json({ message: "API is running" });
});

// Endpoint to upload images
app.post("/upload", upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image was uploaded." });
  }
  res.status(201).json({ message: "Image uploaded successfully", file: req.file });
});

// POST to create/save in the database
app.post("/message", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const conn = await mysql.createConnection(dbConfig);
    const query = "INSERT INTO messages (name, email, message) VALUES (?, ?, ?)";
    await conn.execute(query, [name, email, message]);
    await conn.end();

    res.status(201).json({ message: "Created with success" });
  } catch (e) {
    res.status(500).json({ error: `Something happened on the server: ${e}` });
  }
});

// GET to list the messages
app.get("/message", async (req, res) => {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [rows] = await conn.execute("SELECT * FROM messages");
    await conn.end();
    res.status(200).json(rows);
  } catch (e) {
    res.status(500).json({ error: `Fail: ${e}` });
  }
});

// Initialize the database
async function initDatabase() {
  try {
    const conn = await mysql.createConnection(dbConfig);
    const [tables] = await conn.query("SHOW TABLES like 'messages'");

    if (tables.length === 0) {
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(200) NOT NULL,
          email VARCHAR(200) NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `;

      await conn.query(createTableQuery);
      console.log("Table created");
    } else {
      console.log("Table already created");
    }

    await conn.end();
  } catch (e) {
    console.error(`Database error: ${e}`);
    process.exit(1);
  }
}

initDatabase().then(() => {
  app.listen(port, () => {
    console.log(`The server is running, PORT: ${port}`);
  });
});