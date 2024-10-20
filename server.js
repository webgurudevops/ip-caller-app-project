const WebSocketServer = require('ws').Server; // Correctly require the 'ws' library
const http = require('http');

// Access environment variables for port and API key
const port = process.env.PORT || 3000; // Uses the PORT environment variable or defaults to 3000
const apiKey = process.env.API_KEY;     // Accesses the API key (if applicable)

// Create an HTTP server
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('WebSocket server is running.\n');
});

// Start the HTTP server on the defined port
server.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});

// Create a WebSocket server
const webSocket = new WebSocketServer({ server });

let users = [];

// Handle WebSocket requests
webSocket.on('connection', (connection) => {
    connection.on('message', (message) => {
        let data;
        try {
            data = JSON.parse(message);
        } catch (error) {
            console.error('Invalid JSON:', message);
            return; // Exit if the message is not valid JSON
        }

        const user = findUser(data.username);

        switch (data.type) {
            case 'store_user':
                if (user != null) {
                    user.conn = connection; // Update the connection
                    console.log(`User reconnected: ${user.username}`);
                    return;
                }

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
        const userIndex = users.findIndex((u) => u.conn === connection);
        if (userIndex !== -1) {
            console.log(`User disconnected: ${users[userIndex].username}`);
            users.splice(userIndex, 1);
        }
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
