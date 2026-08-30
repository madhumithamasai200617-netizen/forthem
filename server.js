require("dotenv").config();

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const snowflake = require("snowflake-sdk");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();

/* =====================================================
   MIDDLEWARE
===================================================== */

app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());

/* =====================================================
   ENVIRONMENT VARIABLES
===================================================== */

const PORT = process.env.PORT || 5000;

console.log("======================================");
console.log("        FOR THEM BACKEND");
console.log("======================================");

console.log("Snowflake Account:", process.env.SNOWFLAKE_ACCOUNT);
console.log("Snowflake User:", process.env.SNOWFLAKE_USERNAME);
console.log("Database:", process.env.SNOWFLAKE_DATABASE);
console.log("Schema:", process.env.SNOWFLAKE_SCHEMA);
console.log("Warehouse:", process.env.SNOWFLAKE_WAREHOUSE);

if (!process.env.SNOWFLAKE_PASSWORD) {
    console.error("❌ SNOWFLAKE_PASSWORD is missing");
}

if (!process.env.GEMINI_API_KEY) {
    console.error("❌ GEMINI_API_KEY is missing");
}

/* =====================================================
   SNOWFLAKE CONNECTION
===================================================== */

const connection = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT,
    username: process.env.SNOWFLAKE_USERNAME,
    password: process.env.SNOWFLAKE_PASSWORD,

    warehouse: process.env.SNOWFLAKE_WAREHOUSE,
    database: process.env.SNOWFLAKE_DATABASE,
    schema: process.env.SNOWFLAKE_SCHEMA,
    role: process.env.SNOWFLAKE_ROLE,

    authenticator: "SNOWFLAKE"
});

let snowflakeConnected = false;

console.log("Connecting to Snowflake...");

connection.connect((err) => {

    if (err) {

        console.error("❌ Snowflake connection failed:");
        console.error(err.message);

        snowflakeConnected = false;

        return;
    }

    snowflakeConnected = true;

    console.log("======================================");
    console.log("✅ Snowflake connected successfully!");
    console.log("======================================");
});

/* =====================================================
   GEMINI AI
===================================================== */

const genAI = new GoogleGenerativeAI(
    process.env.GEMINI_API_KEY
);

const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash"
});

/* =====================================================
   DATABASE HELPER
===================================================== */

function executeQuery(sqlText, binds = []) {

    return new Promise((resolve, reject) => {

        if (!snowflakeConnected) {
            return reject(
                new Error("Snowflake is not connected")
            );
        }

        connection.execute({

            sqlText,

            binds,

            complete: (err, stmt, rows) => {

                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }

            }

        });

    });

}

/* =====================================================
   HEALTH CHECK
===================================================== */

app.get("/", (req, res) => {

    res.json({

        success: true,

        message: "FOR THEM backend is running 🚀",

        snowflake:
            snowflakeConnected
                ? "connected"
                : "disconnected",

        chatbot:
            process.env.GEMINI_API_KEY
                ? "configured"
                : "not configured"

    });

});

/* =====================================================
   SNOWFLAKE TEST
===================================================== */

app.get("/api/test-db", async (req, res) => {

    try {

        const rows = await executeQuery(`
            SELECT
                CURRENT_USER() AS USER_NAME,
                CURRENT_ACCOUNT() AS ACCOUNT_NAME,
                CURRENT_DATABASE() AS DATABASE_NAME,
                CURRENT_SCHEMA() AS SCHEMA_NAME,
                CURRENT_WAREHOUSE() AS WAREHOUSE_NAME
        `);

        res.json({

            success: true,

            message: "Snowflake working",

            data: rows[0]

        });

    } catch (error) {

        console.error("Database test error:", error);

        res.status(500).json({

            success: false,

            message: error.message

        });

    }

});

/* =====================================================
   SIGNUP
===================================================== */

app.post("/api/signup", async (req, res) => {

    try {

        const {
            name,
            email,
            password
        } = req.body;

        if (!name || !email || !password) {

            return res.status(400).json({

                success: false,

                message: "All fields are required"

            });

        }

        const cleanName = name.trim();

        const cleanEmail =
            email.trim().toLowerCase();

        /* CHECK USER */

        const existingUsers = await executeQuery(
            `
            SELECT ID
            FROM USERS
            WHERE LOWER(EMAIL) = ?
            `,
            [cleanEmail]
        );

        if (existingUsers.length > 0) {

            return res.status(409).json({

                success: false,

                message: "Email already registered"

            });

        }

        /* HASH PASSWORD */

        const hashedPassword =
            await bcrypt.hash(password, 10);

        /* INSERT USER */

        await executeQuery(
            `
            INSERT INTO USERS
            (
                NAME,
                EMAIL,
                PASSWORD
            )
            VALUES (?, ?, ?)
            `,
            [
                cleanName,
                cleanEmail,
                hashedPassword
            ]
        );

        console.log(
            `✅ New user registered: ${cleanEmail}`
        );

        res.status(201).json({

            success: true,

            message: "Account created successfully",

            user: {

                name: cleanName,

                email: cleanEmail

            }

        });

    } catch (error) {

        console.error(
            "❌ Signup error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Could not create account"

        });

    }

});

/* =====================================================
   LOGIN
===================================================== */

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required"

            });

        }

        const cleanEmail =
            email.trim().toLowerCase();

        const rows = await executeQuery(
            `
            SELECT
                ID,
                NAME,
                EMAIL,
                PASSWORD
            FROM USERS
            WHERE LOWER(EMAIL) = ?
            `,
            [cleanEmail]
        );

        if (rows.length === 0) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }

        const user = rows[0];

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.PASSWORD
            );

        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message:
                    "Invalid email or password"

            });

        }

        console.log(
            `✅ Login successful: ${cleanEmail}`
        );

        res.json({

            success: true,

            message: "Login successful",

            user: {

                id: user.ID,

                name: user.NAME,

                email: user.EMAIL

            }

        });

    } catch (error) {

        console.error(
            "❌ Login error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Login failed"

        });

    }

});

/* =====================================================
   GET USER
===================================================== */

app.get("/api/user/:id", async (req, res) => {

    try {

        const userId = req.params.id;

        const rows = await executeQuery(
            `
            SELECT
                ID,
                NAME,
                EMAIL
            FROM USERS
            WHERE ID = ?
            `,
            [userId]
        );

        if (rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "User not found"

            });

        }

        res.json({

            success: true,

            user: {

                id: rows[0].ID,

                name: rows[0].NAME,

                email: rows[0].EMAIL

            }

        });

    } catch (error) {

        console.error(
            "❌ User fetch error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Database error"

        });

    }

});

/* =====================================================
   CHATBOT
===================================================== */

app.post("/api/chat", async (req, res) => {

    try {

        const {
            message,
            userName
        } = req.body;

        if (!message || !message.trim()) {

            return res.status(400).json({

                success: false,

                message: "Message is required"

            });

        }

        console.log(
            `💬 Chat message from ${
                userName || "User"
            }: ${message}`
        );

        const prompt = `
You are the FOR THEM chatbot.

FOR THEM is a drug-abuse prevention and awareness
platform.

Your job is to provide:
- supportive responses
- drug awareness information
- prevention guidance
- healthy coping suggestions
- encouragement to seek trusted help
- non-judgmental responses

Never encourage drug use.

Never provide instructions for making,
buying, hiding, or abusing drugs.

If someone appears to be in immediate danger,
encourage them to contact local emergency services
or a trusted person immediately.

User name:
${userName || "User"}

User message:
${message}

Give a short, friendly and helpful response.
`;

        const result =
            await model.generateContent(prompt);

        const response =
            result.response.text();

        console.log("🤖 Chatbot replied");

        res.json({

            success: true,

            reply: response

        });

    } catch (error) {

        console.error(
            "❌ Chatbot error:",
            error
        );

        res.status(500).json({

            success: false,

            message:
                "Chatbot is temporarily unavailable"

        });

    }

});

/* =====================================================
   SAVE CHAT
===================================================== */

app.post("/api/chat/save", async (req, res) => {

    try {

        const {
            userId,
            message,
            response
        } = req.body;

        if (!userId || !message || !response) {

            return res.status(400).json({

                success: false,

                message: "Missing chat data"

            });

        }

        /*
        This requires a CHAT_HISTORY table.

        Example:

        CREATE TABLE CHAT_HISTORY (
            ID INTEGER AUTOINCREMENT,
            USER_ID INTEGER,
            MESSAGE STRING,
            RESPONSE STRING,
            CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
        );
        */

        await executeQuery(
            `
            INSERT INTO CHAT_HISTORY
            (
                USER_ID,
                MESSAGE,
                RESPONSE
            )
            VALUES (?, ?, ?)
            `,
            [
                userId,
                message,
                response
            ]
        );

        res.json({

            success: true,

            message: "Chat saved"

        });

    } catch (error) {

        console.error(
            "❌ Chat save error:",
            error
        );

        res.status(500).json({

            success: false,

            message: "Could not save chat"

        });

    }

});

/* =====================================================
   GET CHAT HISTORY
===================================================== */

app.get(
    "/api/chat/history/:userId",
    async (req, res) => {

        try {

            const userId =
                req.params.userId;

            const rows =
                await executeQuery(
                    `
                    SELECT
                        ID,
                        USER_ID,
                        MESSAGE,
                        RESPONSE,
                        CREATED_AT
                    FROM CHAT_HISTORY
                    WHERE USER_ID = ?
                    ORDER BY CREATED_AT ASC
                    `,
                    [userId]
                );

            res.json({

                success: true,

                chats: rows

            });

        } catch (error) {

            console.error(
                "❌ Chat history error:",
                error
            );

            res.status(500).json({

                success: false,

                message:
                    "Could not load chat history"

            });

        }

    }
);

/* =====================================================
   404
===================================================== */

app.use((req, res) => {

    res.status(404).json({

        success: false,

        message: "API endpoint not found",

        path: req.originalUrl

    });

});

/* =====================================================
   START SERVER
===================================================== */

app.listen(PORT, () => {

    console.log("");
    console.log("======================================");
    console.log("🚀 FOR THEM BACKEND RUNNING");
    console.log(
        `🌐 http://localhost:${PORT}`
    );
    console.log("======================================");
    console.log("");

});