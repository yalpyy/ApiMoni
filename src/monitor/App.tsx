import React from "react";

export default function App() {
  const handleHint = () => {
    window.alert("F12 -> API Monitor sekmesi");
  };

  return (
    <div className="monitor">
      <div className="card">
        <div className="badge">Kısayol</div>
        <h1>API İzleyici</h1>
        <p>
          Bu ekran kısayol ile açılır. Detaylı Network yakalama için DevTools
          içindeki API Monitor panelini kullanın.
        </p>
        <p className="muted">
          DevTools paneli açıkken loglar orada görünür.
        </p>
        <button type="button" onClick={handleHint}>
          DevTools’u Açma İpucu
        </button>
      </div>
    </div>
  );
}