import React, { useState } from "react"
import { createRoot } from "react-dom/client"
import App from "./App.jsx"

// Wrapper qui reçoit l'action de démarrage depuis la landing statique
function AppWrapper() {
  const [startAction, setStartAction] = useState(null);

  React.useEffect(() => {
    // Exposer le trigger pour la landing statique
    window.__triggerStart = function(type) {
      setStartAction(type);
    };
    // Signaler que React est prêt
    window.__notifyReactReady && window.__notifyReactReady();

    // Si une action était en attente avant que React soit prêt
    if (window.__pendingLaunch) {
      setStartAction(window.__pendingLaunch);
      delete window.__pendingLaunch;
    }
  }, []);

  return <App initialAction={startAction}/>;
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppWrapper/>
  </React.StrictMode>
)
