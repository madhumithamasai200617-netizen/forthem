// ==========================================
// FOR THEM - AUTHENTICATION
// ==========================================

// IMPORTANT:
// When testing locally:
const API_URL = "http://localhost:5000";

// After deploying backend:
// const API_URL = "https://YOUR-BACKEND-URL.com";


// ==========================================
// SIGNUP
// ==========================================

const signupForm = document.getElementById("signupForm");

if (signupForm) {

    signupForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const name = document.getElementById("name").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value;

        const message = document.getElementById("signupMessage");

        if (!name || !email || !password) {
            message.textContent = "Please fill all fields.";
            return;
        }

        try {

            const response = await fetch(`${API_URL}/signup`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })

            });

            const data = await response.json();

            console.log("Signup response:", data);

            if (data.success) {

                message.textContent =
                    "Account created successfully!";

                // Save name temporarily
                localStorage.setItem("userName", name);
                localStorage.setItem("userEmail", email);

                // Go to login
                setTimeout(() => {
                    window.location.href = "login.html";
                }, 1000);

            } else {

                message.textContent =
                    data.message || "Signup failed.";

            }

        } catch (error) {

            console.error("Signup error:", error);

            message.textContent =
                "Cannot connect to server.";

        }

    });
}


// ==========================================
// LOGIN
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (e) {

        e.preventDefault();

        const email = document
            .getElementById("loginEmail")
            .value
            .trim();

        const password = document
            .getElementById("loginPassword")
            .value;

        const message = document.getElementById("loginMessage");

        if (!email || !password) {

            message.textContent =
                "Enter email and password.";

            return;
        }

        try {

            const response = await fetch(`${API_URL}/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })

            });

            const data = await response.json();

            console.log("Login response:", data);

            if (data.success) {

                // ==================================
                // SAVE LOGGED-IN USER
                // ==================================

                localStorage.setItem(
                    "userId",
                    data.user.id
                );

                localStorage.setItem(
                    "userName",
                    data.user.name
                );

                localStorage.setItem(
                    "userEmail",
                    data.user.email
                );

                localStorage.setItem(
                    "isLoggedIn",
                    "true"
                );

                message.textContent =
                    "Login successful!";

                // ==================================
                // GO TO QUESTION PAGE
                // ==================================

                setTimeout(() => {

                    window.location.href =
                        "nexus.html";

                }, 700);

            } else {

                message.textContent =
                    data.message || "Login failed.";

            }

        } catch (error) {

            console.error("Login error:", error);

            message.textContent =
                "Cannot connect to server.";

        }

    });
}