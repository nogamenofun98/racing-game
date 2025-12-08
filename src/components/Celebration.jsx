import React from 'react'

function Celebration({ winner, isHost, onReuseRoom, onExitRoom, onReload }) {
    if (!winner) return null

    return (
        <div className="celebration-overlay">
            <div className="winner-text">WINNER!</div>
            <div className="winner-name">{winner.name}</div>
            <div className="celebration-actions">
                {isHost ? (
                    <>
                        <button className="start-btn" onClick={onReuseRoom} style={{ maxWidth: '220px' }}>Restart Same Room</button>
                        <button className="back-btn" onClick={onExitRoom} style={{ maxWidth: '220px' }}>Close Room</button>
                    </>
                ) : (
                    <>
                        <div className="celebration-note">Waiting host to restart game room...</div>
                        <button className="start-btn" onClick={onReload} style={{ maxWidth: '220px' }}>
                            Reload / Rejoin
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

export default Celebration
