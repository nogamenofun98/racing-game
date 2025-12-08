import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import RaceTrack from './components/RaceTrack'
import SetupScreen from './components/SetupScreen'
import Lobby from './components/Lobby'
import GameControls from './components/GameControls'
import Background from './components/Background'
import Timer from './components/Timer'
import Celebration from './components/Celebration'
import MiniMap from './components/MiniMap'
import audioController from './utils/AudioController'
import './index.css'

const TRACK_LENGTH = 5000
const SOCKET_URL = '/'

function App() {
  const [gameState, setGameState] = useState('menu') // menu, lobby, countdown, racing, finished
  const [racers, setRacers] = useState([])
  const [roomId, setRoomId] = useState('')
  const [isHost, setIsHost] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const isHostRef = useRef(false)
  const roomIdRef = useRef('')

  const socketRef = useRef(null)
  const requestRef = useRef()
  const lastTimeRef = useRef()
  const lastSyncTimeRef = useRef(0)
  const lastUiUpdateRef = useRef(0) // Throttling UI updates
  const startTimeRef = useRef(0)
  const racersRef = useRef([])
  const finishOrderRef = useRef(1)
  const cameraPositionRef = useRef(0)

  const timerRef = useRef(null)

  // Direct DOM refs for performance
  const racerDomRefs = useRef({})
  const miniMapRefs = useRef({})
  const trackContainerRef = useRef(null)

  // Keep roomIdRef in sync with roomId state
  useEffect(() => {
    roomIdRef.current = roomId
  }, [roomId])

  const registerRacerRef = useCallback((id, el) => {
    if (el) {
      racerDomRefs.current[id] = el
    } else {
      delete racerDomRefs.current[id]
    }
  }, [])

  const registerMiniMapRef = useCallback((id, el) => {
    if (el) {
      miniMapRefs.current[id] = el
    } else {
      delete miniMapRefs.current[id]
    }
  }, [])

  const updateDomElements = () => {
    // 1. Update Racers
    racersRef.current.forEach(r => {
      const el = racerDomRefs.current[r.id]
      if (el) {
        el.style.transform = `translateX(${r.position}px)`
      }

      // 2. Update Minimap
      const dot = miniMapRefs.current[r.id]
      if (dot) {
        const pct = Math.min(100, Math.max(0, (r.position / TRACK_LENGTH) * 100))
        dot.style.left = `${pct}%`
      }
    })

    // 3. Update Camera
    if (trackContainerRef.current) {
      trackContainerRef.current.style.transform = `translateX(-${cameraPositionRef.current}px)`
    }
  }

  const gameLoop = (time) => {
    if (!lastTimeRef.current) lastTimeRef.current = time
    const deltaTime = time - lastTimeRef.current
    lastTimeRef.current = time

    let raceFinished = false
    let maxPosition = 0

    racersRef.current.forEach(r => {
      if (typeof r.position === 'undefined') r.position = 0
      if (typeof r.speed === 'undefined') r.speed = 0
      if (typeof r.finished === 'undefined') r.finished = false

      if (r.finished) {
        raceFinished = true
      } else {
        r.speed *= 0.98
        const baseVariance = r.variance || 1
        const jitter = 0.9 + Math.random() * 0.2 // Keeps small differences per tick
        const baseSpeed = (0.02 + Math.random() * 0.06) * baseVariance * jitter
        r.speed += baseSpeed
        r.position += r.speed * (deltaTime / 16)

        if (r.position >= TRACK_LENGTH) {
          r.finished = true
          raceFinished = true
          r.place = finishOrderRef.current++
          audioController.playSound('win')
        }
      }
      maxPosition = Math.max(maxPosition, r.position)
    })

    // Camera follows leader - Improved Layout
    // On mobile, we want the leader to be more centered or slightly to the left to see the track ahead
    const screenWidth = window.innerWidth
    const offset = screenWidth < 768 ? screenWidth * 0.3 : screenWidth * 0.4
    const targetCamPos = Math.max(0, maxPosition - offset)
    cameraPositionRef.current = targetCamPos

    // Apply updates to DOM
    updateDomElements()

    // Sync state to clients (Throttled to ~30ms) OR if race is finished
    if (time - lastSyncTimeRef.current > 30 || raceFinished) {
      socketRef.current.emit('syncState', {
        roomId: roomIdRef.current,
        gameState: {
          racers: racersRef.current,
          cameraPosition: cameraPositionRef.current,
          status: raceFinished ? 'finished' : 'racing'
        }
      })
      lastSyncTimeRef.current = time
    }

    // Update local React state for rendering UI (Buttons, etc) throttled
    // 200ms is enough for "Wait..." button states and ranking updates
    if (time - lastUiUpdateRef.current > 200 || raceFinished) {
      setRacers([...racersRef.current])
      lastUiUpdateRef.current = time
    }

    if (!raceFinished) {
      requestRef.current = requestAnimationFrame(gameLoop)
    } else {
      setGameState('finished')
      // Ensure one final update to snap everything to finish
      setRacers([...racersRef.current])
    }
  }

  useEffect(() => {
    socketRef.current = io(SOCKET_URL)

    socketRef.current.on('connect', () => {
      console.log('Connected to server')
    })

    socketRef.current.on('updateLobby', (updatedRacers) => {
      setRacers(updatedRacers)
      racersRef.current = updatedRacers.map(r => ({
        ...r,
        position: 0,
        speed: 0,
        finished: false,
        place: null,
        // Stable per-racer quirks to add personality to boosts and base speed
        variance: 0.9 + Math.random() * 0.2, // 0.9 - 1.1
        critChance: 0.12 + Math.random() * 0.12 // 12% - 24%
      }))
    })

    socketRef.current.on('raceCountdown', (value) => {
      setCountdown(value)
      setGameState('countdown')
    })

    socketRef.current.on('raceStarted', () => {
      setCountdown(null)
      setGameState('racing')
      audioController.playSound('start')
      startTimeRef.current = Date.now()
      console.log('Race started')

      if (isHostRef.current) {
        lastTimeRef.current = performance.now()
        requestRef.current = requestAnimationFrame(gameLoop)
      }
    })

    socketRef.current.on('gameStateUpdate', (serverState) => {
      if (!isHostRef.current) {
        if (Array.isArray(serverState.racers)) {
          // Update ref state
          racersRef.current = serverState.racers
          cameraPositionRef.current = serverState.cameraPosition

          // DIRECT DOM UPDATE for Client
          updateDomElements()

          // Throttle React State updates to avoid lag
          // Only update React state if status changed or throttling allows (e.g. for progress bars or UI)
          if (serverState.status === 'finished') {
            setGameState('finished')
            setRacers([...racersRef.current]) // Ensure final state is consistent
          } else {
            // Optional: Throttle setRacers for UI (ranking/buttons)
            // setRacers([...racersRef.current]) 
          }
        }
      }
    })

    socketRef.current.on('applyBoost', (racerId) => {
      if (isHostRef.current) {
        const racer = racersRef.current.find(r => r.id === racerId)
        if (racer && !racer.finished) {
          const variance = racer.variance || 1
          const swing = 0.8 + Math.random() * 0.6 // 0.8 - 1.4
          const chaos = 0.9 + Math.random() * 0.3 // 0.9 - 1.2
          const critChance = racer.critChance || 0.18
          const crit = Math.random() < critChance ? 1.35 + Math.random() * 0.25 : 1
          const boostAmount = (0.8 + Math.random() * 0.4) * variance * swing * chaos * crit
          // Cap to keep medium intensity while still noticeable
          racer.speed += Math.min(boostAmount, 2.4)
          audioController.playSound('cheer')
        }
      }
    })

    return () => {
      socketRef.current.disconnect()
      cancelAnimationFrame(requestRef.current)
    }
  }, [])

  const createRoom = (name) => {
    socketRef.current.emit('createRoom', name, ({ roomId, isHost }) => {
      setRoomId(roomId)
      setIsHost(isHost)
      isHostRef.current = isHost
      setGameState('lobby')
    })
  }

  const joinRoom = (roomId, name) => {
    socketRef.current.emit('joinRoom', { roomId, name }, ({ success, error }) => {
      if (success) {
        setRoomId(roomId)
        setIsHost(false)
        isHostRef.current = false
        setGameState('lobby')
      } else {
        alert(error)
      }
    })
  }

  const startRace = () => {
    socketRef.current.emit('startRace', roomId)
  }

  const handleBoost = (racerId) => {
    socketRef.current.emit('boostRacer', { roomId, racerId })
  }

  // Timer Loop
  useEffect(() => {
    let animationFrameId

    const updateTimer = () => {
      if (gameState === 'racing' && startTimeRef.current > 0) {
        const elapsed = Date.now() - startTimeRef.current
        if (timerRef.current) {
          const minutes = Math.floor(elapsed / 60000)
          const seconds = Math.floor((elapsed % 60000) / 1000)
          const centiseconds = Math.floor((elapsed % 1000) / 10)
          timerRef.current.innerText = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${centiseconds.toString().padStart(2, '0')}`
        }
        animationFrameId = requestAnimationFrame(updateTimer)
      }
    }

    if (gameState === 'racing') {
      updateTimer()
    }

    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [gameState])

  return (
    <div className="game-container">
      {gameState === 'menu' && (
        <SetupScreen onCreateRoom={createRoom} onJoinRoom={joinRoom} />
      )}

      {(gameState === 'lobby' || gameState === 'countdown') && (
        <Lobby
          roomId={roomId}
          racers={racers}
          isHost={isHost}
          onStartRace={startRace}
          isStarting={gameState === 'countdown'}
        />
      )}

      {(gameState === 'racing' || gameState === 'finished') && (
        <>
          <Timer ref={timerRef} />
          <MiniMap
            racers={racers}
            trackLength={TRACK_LENGTH}
            onRegisterDotRef={registerMiniMapRef}
          />
          <Background cameraPosition={cameraPositionRef.current} />
          <RaceTrack
            ref={trackContainerRef}
            racers={racers}
            trackLength={TRACK_LENGTH}
            cameraPosition={cameraPositionRef.current}
            onRegisterRacerRef={registerRacerRef}
          />
          <GameControls racers={racers} onBoost={handleBoost} />
        </>
      )}

      {gameState === 'finished' && (
        <Celebration
          winner={racers.find(r => r.place === 1) || racers[0]}
          onReset={() => window.location.reload()}
        />
      )}

      {gameState === 'countdown' && countdown !== null && (
        <div className="countdown-overlay">
          <div className="countdown-overlay__circle">
            <span className="countdown-overlay__number">{countdown}</span>
          </div>
          <div className="countdown-overlay__subtext">Race starting...</div>
        </div>
      )}
    </div>
  )
}

export default App
