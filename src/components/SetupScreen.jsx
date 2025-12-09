import React, { useState } from 'react'

export default function SetupScreen({ onJoinRoom, onCreateRoom, prefilledRoomId = '', onPeekRoom, peekRacers = [], peekTitle = '' }) {
    const [name, setName] = useState('')
    const [roomId, setRoomId] = useState(prefilledRoomId ? prefilledRoomId.toUpperCase() : '')
    const [mode, setMode] = useState(prefilledRoomId ? 'join' : 'menu') // menu, join
    const [title, setTitle] = useState('Racing Room')

    // Keep room ID and mode aligned when a prefill arrives later (e.g., reset)
    React.useEffect(() => {
        if (prefilledRoomId) {
            setRoomId(prefilledRoomId.toUpperCase())
            setMode('join')
            onPeekRoom && onPeekRoom(prefilledRoomId.toUpperCase())
        }
    }, [prefilledRoomId, onPeekRoom])

    React.useEffect(() => {
        if (mode === 'join' && roomId.length >= 3) {
            onPeekRoom && onPeekRoom(roomId)
        }
    }, [mode, roomId, onPeekRoom])

    const handleCreate = () => {
        if (!name.trim()) return alert('Please enter your racer name')
        onCreateRoom(name, title)
    }

    const handleJoin = () => {
        if (!name.trim()) return alert('Please enter your racer name')
        if (!roomId.trim()) return alert('Please enter Room ID')
        onJoinRoom(roomId, name)
    }

    return (
        <div className="setup-screen">
            <h1>Multiplayer Racing</h1>

            {prefilledRoomId && (
                <div className="prefill-hint">
                    Invite link detected — Room ID is prefilled for you.
                </div>
            )}

            <div className="input-group">
                <label>Your Racer Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your racer name"
                    maxLength={30}
                />
            </div>

            {mode === 'menu' && (
                <div className="input-group">
                    <label>Game Title (for hosts)</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Friday Night Sprint"
                        maxLength={80}
                    />
                </div>
            )}

            {mode === 'menu' && (
                <div className="menu-buttons">
                    <button className="add-btn" onClick={handleCreate}>Create Room</button>
                    <button className="start-btn" onClick={() => setMode('join')}>Join Room</button>
                </div>
            )}

            {mode === 'join' && (
                <div className="join-form">
                    <div className="input-group">
                        <label>Room ID</label>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                            placeholder="5-CHAR ID"
                            maxLength={5}
                        />
                    </div>
                    {peekRacers.length > 0 && (
                        <div className="racers-preview">
                            <div className="preview-title">{peekTitle || 'Game title'}</div>
                            <div className="racers-grid">
                                {peekRacers.map((racer, index) => (
                                    <div key={racer.id || index} className="racer-card" style={{
                                        borderColor: racer.isHost ? '#FFD700' : '#ccc',
                                        background: 'rgba(255, 255, 255, 0.1)'
                                    }}>
                                        <div className="racer-avatar" style={{ backgroundColor: `hsl(${[0, 120, 240, 60, 300, 180, 30, 270][(racer.colorIndex !== undefined ? racer.colorIndex : (racer.id ? racer.id.charCodeAt(0) : 0)) % 8]}, 70%, 50%)` }}></div>
                                        <span className="racer-name">
                                            {racer.name} {racer.isHost && '👑'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <button className="start-btn" onClick={handleJoin}>Join!</button>
                    <button className="back-btn" onClick={() => setMode('menu')} style={{ marginTop: '10px', background: 'transparent', border: '1px solid #fff' }}>Back</button>
                </div>
            )}
        </div>
    )
}
