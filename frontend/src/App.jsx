import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { WalletProvider } from './contexts/WalletContext';
import { GameProvider } from './contexts/GameContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import CreateRoom from './pages/CreateRoom';
import Room from './pages/Room';
import GamePlay from './pages/GamePlay';
import Leaderboard from './pages/Leaderboard';
import Profile from './pages/Profile';

function App() {
  return (
    <WalletProvider>
      <GameProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/create-room" element={<CreateRoom />} />
              <Route path="/room/:roomId" element={<Room />} />
              <Route path="/game/:gameId" element={<GamePlay />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/profile" element={<Profile />} />
            </Routes>
          </Layout>
        </Router>
      </GameProvider>
    </WalletProvider>
  );
}

export default App;
