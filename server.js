const WebSocketServer = require('ws').Server; // Correctly require the 'ws' library
const http = require('http');

// Access environment variables for port and API key
const port = process.env.PORT || 3000; // Uses the PORT environment variable or defaults to 3000
const apiKey = process.env.API_KEY;     // Accesses the API key (if applicable)

// Create an HTTP server
const server = http.createServer((req, res) => {});

// Start the HTTP server on port 3000
server.listen(3000, () => {
    console.log('Listening on port 3000...');
});

// Create a WebSocket server
const webSocket = new WebSocketServer({ server });

let users = [];

// Handle WebSocket requests
webSocket.on('connection', (connection) => {
    connection.on('message', (message) => {
        const data = JSON.parse(message);

        const user = findUser(data.username);

        switch (data.type) {
            case 'store_user':
                // If user already exists, return early
                if (user != null) return;

                const newUser = {
                    conn: connection,
                    username: data.username,
                };

                users.push(newUser);
                console.log(`User connected: ${newUser.username}`);
                break;

            case 'store_offer':
                if (user == null) return; // User must exist
                user.offer = data.offer; // Store the offer
                break;

            case 'store_candidate':
                if (user == null) return; // User must exist
                user.candidates = user.candidates || []; // Initialize candidates if not set
                user.candidates.push(data.candidate); // Store the candidate
                break;

            case 'send_answer':
                if (user == null) return; // User must exist
                sendData({ type: 'answer', answer: data.answer }, user.conn); // Send answer
                break;

            case 'send_candidate':
                if (user == null) return; // User must exist
                sendData({ type: 'candidate', candidate: data.candidate }, user.conn); // Send candidate
                break;

            case 'join_call':
                if (user == null) return; // User must exist
                sendData({ type: 'offer', offer: user.offer }, connection); // Send the user's offer

                // Send candidates to the new connection
                user.candidates.forEach((candidate) => {
                    sendData({ type: 'candidate', candidate: candidate }, connection);
                });
                break;
        }
    });

    // Handle connection close
    connection.on('close', () => {
        // Remove user from the users array
        users = users.filter((user) => user.conn !== connection);
        console.log('User disconnected.');
    });
});

// Function to send data to a specific connection
function sendData(data, conn) {
    conn.send(JSON.stringify(data));
}

// Function to find a user by username
function findUser(username) {
    return users.find((user) => user.username === username);
}
