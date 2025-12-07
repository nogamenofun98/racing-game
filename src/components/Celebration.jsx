import React from 'react'

function Celebration({ winner, onReset }) {
    return (
        <div className="celebration-overlay">
            <div className="winner-text">WINNER!</div>
            <div className="winner-name">{winner.name}</div>
            <button className="start-btn" onClick={onReset} style={{ maxWidth: '200px' }}>Race Again</button>
        </div>
    )
}

export default Celebration
