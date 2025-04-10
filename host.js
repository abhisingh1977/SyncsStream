// host.js
const peer = new Peer(); // Create a Peer instance
let localStream;
let screenStream;
let connections = [];
const remoteStreams = {}; // Store remote streams by peer ID

// Display the host's peer ID
peer.on('open', (id) => {
  document.getElementById('peer-id').textContent = id;
});

// Create virtual space
document.getElementById('create-space').addEventListener('click', async () => {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    document.getElementById('host-video').srcObject = localStream;
  } catch (error) {
    console.error('Error accessing media devices:', error);
  }
});

// Start screen sharing
document.getElementById('start-screen-share').addEventListener('click', async () => {
  try {
    screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
    document.getElementById('host-screen').srcObject = screenStream;

    // Send the screen-sharing stream to all connected clients
    connections.forEach(conn => {
      const call = peer.call(conn.peer, screenStream);
      call.on('stream', (remoteStream) => {
        // Clients will handle this stream in their own code
      });
    });
  } catch (error) {
    console.error('Error sharing screen:', error);
  }
});

// Toggle video on/off
document.getElementById('toggle-video').addEventListener('click', () => {
  const videoTrack = localStream.getVideoTracks()[0];
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled;
  }
});

// End call
document.getElementById('end-call').addEventListener('click', () => {
  connections.forEach(conn => conn.close());
  if (localStream) localStream.getTracks().forEach(track => track.stop());
  if (screenStream) screenStream.getTracks().forEach(track => track.stop());
  document.getElementById('host-video').srcObject = null;
  document.getElementById('host-screen').srcObject = null;
  document.getElementById('face-cams').innerHTML = ''; // Clear face cams
  remoteStreams = {}; // Clear remote streams
});

// Handle incoming connections
peer.on('connection', (conn) => {
  conn.on('open', () => {
    connections.push(conn);
    conn.send('Welcome to the host space!');

    // Notify all clients about the new client
    connections.forEach((connection) => {
      if (connection !== conn) {
        connection.send({ type: 'new-client', peerId: conn.peer });
      }
    });
  });
});

// Handle incoming calls (video streams from clients)
peer.on('call', (call) => {
  call.answer(localStream); // Answer the call with the host's stream
  call.on('stream', (remoteStream) => {
    if (!remoteStreams[call.peer]) {
      // Add the client's video stream only if it doesn't already exist
      const clientVideo = document.createElement('video');
      clientVideo.srcObject = remoteStream;
      clientVideo.autoplay = true;
      clientVideo.classList.add('client-video');
      document.getElementById('face-cams').appendChild(clientVideo);

      remoteStreams[call.peer] = clientVideo; // Store the video element
    }
  });
});