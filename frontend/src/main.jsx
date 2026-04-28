import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import ConnectionGate from './components/ConnectionGate.jsx';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConnectionGate>
        <App />
      </ConnectionGate>
    </BrowserRouter>
  </React.StrictMode>
);
