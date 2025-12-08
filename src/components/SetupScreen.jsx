import React, { useState } from 'react'

export default function SetupScreen({ onJoinRoom, onCreateRoom, prefilledRoomId = '' }) {
    const [name, setName] = useState('')
    const [roomId, setRoomId] = useState(prefilledRoomId ? prefilledRoomId.toUpperCase() : '')
    const [mode, setMode] = useState(prefilledRoomId ? 'join' : 'menu') // menu, join

    const handleCreate = () => {
        if (!name.trim()) return alert('Please enter your food name')
        onCreateRoom(name)
    }

    const handleJoin = () => {
        if (!name.trim()) return alert('Please enter your food name')
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
                <label>Your Food Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your food name"
                    maxLength={10}
                />
            </div>

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
                    <button className="start-btn" onClick={handleJoin}>Join!</button>
                    <button className="back-btn" onClick={() => setMode('menu')} style={{ marginTop: '10px', background: 'transparent', border: '1px solid #fff' }}>Back</button>
                </div>
            )}
        </div>
    )
}
