import { useState, useEffect } from "react";
import { Device } from "twilio-client";

function App() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [device, setDevice] = useState(null);
  const [status, setStatus] = useState("idle");
  const [transcript, setTranscript] = useState("");
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [chunks, setChunks] = useState([]);

  useEffect(() => {
    async function setupDevice() {
      const token = await fetch("/api/twilio-token").then(res => res.text());
      const dev = new Device(token);
      dev.on("ready", () => setStatus("ready"));
      dev.on("connect", () => setStatus("in call"));
      dev.on("disconnect", () => setStatus("idle"));
      setDevice(dev);
    }
    setupDevice();
  }, []);

  const startCall = () => {
    if (device) {
      device.connect({ To: phoneNumber });
      startRecording();
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    const localChunks = [];

    recorder.ondataavailable = (e) => localChunks.push(e.data);
    recorder.onstop = async () => {
      const blob = new Blob(localChunks, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "call_audio.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setTranscript(data.transcript);
    };

    recorder.start();
    setMediaRecorder(recorder);
    setChunks(localChunks);
  };

  const endCall = () => {
    if (mediaRecorder) mediaRecorder.stop();
    if (device) device.disconnectAll();
  };

  return (
    <div className="p-6 text-white bg-gray-900 min-h-screen flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Calltez - AI Voice Call</h1>
      <input
        value={phoneNumber}
        onChange={(e) => setPhoneNumber(e.target.value)}
        placeholder="Enter phone number"
        className="p-2 text-black rounded mb-4 w-80"
      />
      <div className="flex gap-4">
        <button onClick={startCall} className="bg-blue-600 px-4 py-2 rounded">Start Call</button>
        <button onClick={endCall} className="bg-red-600 px-4 py-2 rounded">End Call</button>
      </div>
      {transcript && (
        <div className="mt-6 bg-gray-800 p-4 rounded w-2/3">
          <h2 className="font-semibold text-xl mb-2">Transcript:</h2>
          <p>{transcript}</p>
        </div>
      )}
    </div>
  );
}

export default App;