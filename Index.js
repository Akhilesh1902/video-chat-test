let peerConection;

let localStream;
let remoteStream;
let client;

const APP_ID = "43d7dae490f9484aaf492be328bc9363";

const uid = String(Math.floor(Math.random() * 10000));

const token = null;

// let servers = {
//   iceServers: [
//     {
//       urls: ["stun:stun1.1.google.com:19302", "stun:stun2.1.google.com:19302"],
//     },
//   ],
// };

let init = async () => {
  // agora stuff
  client = await AgoraRTM.createInstance(APP_ID);
  await client.login({ uid, token });

  const channel = client.createChannel("main");
  channel.join();

  channel.on("MemberJoined", handlePeerJoined);
  client.on("MessageFromPeer", handleMessageFromPeer);

  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  });

  document.getElementById("user-1").srcObject = localStream;
};

// peer joining

let handlePeerJoined = async (memberId) => {
  // client.sendMessageToPeer({ text: "hey" }, memberId);
  createOffer(memberId);
};

// sending message {agora}

let handleMessageFromPeer = async (message, memberId) => {
  // console.log("Message : ", message.type);
  message = JSON.parse(message.text);
  console.log(message);
  if (message.type === "offer") {
    document.getElementById("offer-sdp").value = JSON.stringify(message.offer);
    createAnswer(memberId);
  }

  if (message.type === "answer") {
    document.getElementById("answer-sdp").value = JSON.stringify(
      message.answer
    );
    // createAnswer(memberId);
    addAnswer();
  }

  if (message.type === "canditate") {
    if (peerConection) {
      peerConection.addIceCandidate(message.candidate);
    }
  }
};

//creating peer connection

const createPeerConnection = (sdpType, memberId) => {
  peerConection = new RTCPeerConnection();
  remoteStream = new MediaStream();
  document.getElementById("user-2").srcObject = remoteStream;

  localStream.getTracks().forEach((track) => {
    peerConection.addTrack(track, localStream);
  });

  peerConection.ontrack = async (event) => {
    event.streams[0].getTracks().forEach((track) => {
      remoteStream.addTrack(track);
    });
  };

  peerConection.onicecandidate = async (event) => {
    if (event.candidate) {
      document.getElementById(sdpType).value = JSON.stringify(
        peerConection.localDescription
      );
      client.sendMessageToPeer(
        {
          text: JSON.stringify({
            type: "canditate",
            candidate: event.candidate,
          }),
        },
        memberId
      );
    }
  };
};

let createOffer = async (memberId) => {
  createPeerConnection("offer-sdp", memberId);

  let offer = await peerConection.createOffer();
  await peerConection.setLocalDescription(offer);

  document.getElementById("offer-sdp").value = JSON.stringify(offer);
  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "offer", offer: offer }) },
    memberId
  );
};

let createAnswer = async (memberId) => {
  createPeerConnection("answer-sdp", memberId);

  let offer = document.getElementById("offer-sdp").value;
  if (!offer) return alert("retrive offer from peer first");

  offer = JSON.parse(offer);

  await peerConection.setRemoteDescription(offer);

  let answer = await peerConection.createAnswer();
  await peerConection.setLocalDescription(answer);

  document.getElementById("answer-sdp").value = JSON.stringify(answer);
  client.sendMessageToPeer(
    { text: JSON.stringify({ type: "answer", answer: answer }) },
    memberId
  );
};

let addAnswer = async () => {
  let ans = document.getElementById("answer-sdp").value;
  if (!ans) return alert("retrive answer from peer");

  ans = JSON.parse(ans);

  if (!peerConection.currentRemoteDescription) {
    peerConection.setRemoteDescription(ans);
  }
};

// document.getElementById("create-offer").addEventListener("click", createOffer);
// document.getElementById("add-answer").addEventListener("click", addAnswer);
// document
//   .getElementById("create-answer")
//   .addEventListener("click", createAnswer);

init();
