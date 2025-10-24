import React from 'react'
import { createRoot } from 'react-dom/client'
import GameRoom from '../../example-react/GameRoom'
import './styles.css'

function App() {
    return (
        <div>
            <GameRoom />
        </div>
    )
}

createRoot(document.getElementById('root')).render(<App />)
