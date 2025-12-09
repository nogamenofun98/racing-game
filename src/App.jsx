import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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

const TRACK_LENGTH = 7500
const SOCKET_URL = '/'

function App() {
  const inviteRoomId = useMemo(() => {
    const params = new URLSearchParams(window.location.search)
    const paramRoomId = params.get('roomId') || params.get('room') || params.get('roomid')
    if (!paramRoomId) return ''
    return paramRoomId.trim().toUpperCase().slice(0, 5)
  }, [])

  const [gameState, setGameState] = useState('menu') // menu, lobby, countdown, racing, finished
  const [racers, setRacers] = useState([])
  const [winner, setWinner] = useState(null)
  const [roomId, setRoomId] = useState('')
  const [roomTitle, setRoomTitle] = useState('')
  const [prefilledRoomId, setPrefilledRoomId] = useState(inviteRoomId)
  const [isHost, setIsHost] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const [peekRacers, setPeekRacers] = useState([])
  const [peekTitle, setPeekTitle] = useState('')
  const isHostRef = useRef(false)
  const roomIdRef = useRef('')
  const roomTitleRef = useRef('')
  const winnerRef = useRef(null)
  const gameStateRef = useRef('menu')

  const socketRef = useRef(null)
  const requestRef = useRef()
  const lastTimeRef = useRef()
  const lastSyncTimeRef = useRef(0)
  const lastUiUpdateRef = useRef(0) // Throttling UI updates
  const startTimeRef = useRef(0)
  const racersRef = useRef([])
  const finishOrderRef = useRef(1)
  const cameraPositionRef = useRef(0)
  const pendingPeekIdRef = useRef('')

  const timerRef = useRef(null)

  // Direct DOM refs for performance
  const racerDomRefs = useRef({})
  const miniMapRefs = useRef({})
  const trackContainerRef = useRef(null)

  // Keep roomIdRef in sync with roomId state
  useEffect(() => {
    roomIdRef.current = roomId
  }, [roomId])

  // Keep roomTitleRef in sync with roomTitle state
  useEffect(() => {
    roomTitleRef.current = roomTitle
  }, [roomTitle])

  // Track latest game state for event handlers
  useEffect(() => {
    gameStateRef.current = gameState
  }, [gameState])

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

  const hydrateRacers = useCallback((list = []) => list.map(r => ({
    ...r,
    position: 0,
    speed: 0,
    finished: false,
    place: null,
    variance: 0.9 + Math.random() * 0.2, // 0.9 - 1.1
    critChance: 0.12 + Math.random() * 0.12 // 12% - 24%
  })), [])

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

    // 4. Update background parallax offsets
    const root = document.documentElement
    if (root) {
      root.style.setProperty('--camera-x', `${cameraPositionRef.current}px`)
    }
  }

  const gameLoop = useCallback(function loop(time) {
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
          if (r.place === 1) {
            // Snapshot winner immediately to keep stable even if roster changes
            winnerRef.current = { id: r.id, name: r.name, colorIndex: r.colorIndex }
            setWinner(winnerRef.current)
          }
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
          status: raceFinished ? 'finished' : 'racing',
          winner: winnerRef.current
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
      requestRef.current = requestAnimationFrame(loop)
    } else {
      if (!winnerRef.current) {
        const first = racersRef.current.find(r => r.place === 1) || racersRef.current[0]
        if (first) {
          winnerRef.current = { id: first.id, name: first.name, colorIndex: first.colorIndex }
        }
      }
      if (winnerRef.current) setWinner(winnerRef.current)
      setGameState('finished')
      // Ensure one final update to snap everything to finish
      setRacers([...racersRef.current])
    }
  }, [])

  useEffect(() => {
    socketRef.current = io(SOCKET_URL)

    socketRef.current.on('connect', () => {
      console.log('Connected to server')
      if (pendingPeekIdRef.current) {
        const id = pendingPeekIdRef.current
        socketRef.current.emit('peekRoom', { roomId: id }, (resp) => {
          if (resp?.racers) {
            setPeekRacers(resp.racers)
            if (resp.title) setPeekTitle(resp.title)
          }
          if (pendingPeekIdRef.current === id) {
            pendingPeekIdRef.current = ''
          }
        })
      }
    })

    socketRef.current.on('updateLobby', (payload) => {
      // Ignore lobby reshuffles while racing/finished to avoid wiping finish data
      if (!['menu', 'lobby', 'countdown'].includes(gameStateRef.current)) return

      const nextRacers = Array.isArray(payload) ? payload : payload?.racers || []
      const nextTitle = Array.isArray(payload) ? roomTitleRef.current : payload?.title

      const hydrated = hydrateRacers(nextRacers)
      setRacers(hydrated)
      racersRef.current = hydrated

      if (typeof nextTitle === 'string') {
        setRoomTitle(nextTitle)
        roomTitleRef.current = nextTitle
      }
    })

    socketRef.current.on('raceCountdown', (value) => {
      setCountdown(value)
      setGameState('countdown')
    })

    socketRef.current.on('raceStarted', () => {
      setCountdown(null)
      setGameState('racing')
      setWinner(null)
      winnerRef.current = null
      finishOrderRef.current = 1
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
          if (serverState.winner) {
            winnerRef.current = serverState.winner
          }

          // DIRECT DOM UPDATE for Client
          updateDomElements()

          // Throttle React State updates to avoid lag
          // Only update React state if status changed or throttling allows (e.g. for progress bars or UI)
          if (serverState.status === 'finished') {
            setGameState('finished')
            if (winnerRef.current) setWinner(winnerRef.current)
            else {
              const first = racersRef.current.find(r => r.place === 1) || racersRef.current[0]
              if (first) setWinner({ id: first.id, name: first.name, colorIndex: first.colorIndex })
            }
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

    socketRef.current.on('roomReset', ({ roomId: resetRoomId, hostId, racers: resetRacers, title }) => {
      // Clear winner and race refs
      winnerRef.current = null
      setWinner(null)
      finishOrderRef.current = 1
      startTimeRef.current = 0
      lastTimeRef.current = 0
      lastSyncTimeRef.current = 0

      setPrefilledRoomId(resetRoomId)
      setRoomId(resetRoomId)

      if (socketRef.current.id === hostId) {
        setIsHost(true)
        isHostRef.current = true
        const hydrated = hydrateRacers(resetRacers || [])
        racersRef.current = hydrated
        setRacers(hydrated)
        gameStateRef.current = 'lobby'
        setGameState('lobby')
        const resolvedTitle = title || roomTitleRef.current || 'Racing Room'
        setRoomTitle(resolvedTitle)
        roomTitleRef.current = resolvedTitle
      } else {
        setIsHost(false)
        isHostRef.current = false
        racersRef.current = []
        setRacers([])
        gameStateRef.current = 'menu'
        setGameState('menu') // let players re-enter their racer names
      }
      setCountdown(null)
    })

    socketRef.current.on('roomClosed', () => {
      winnerRef.current = null
      setWinner(null)
      finishOrderRef.current = 1
      setRacers([])
      racersRef.current = []
      setIsHost(false)
      isHostRef.current = false
      setRoomId('')
      setPrefilledRoomId('')
      setRoomTitle('')
      gameStateRef.current = 'menu'
      setGameState('menu')
    })

    return () => {
      socketRef.current.disconnect()
      cancelAnimationFrame(requestRef.current)
    }
  }, [gameLoop, hydrateRacers])

  const createRoom = (name, title) => {
    const fallbackTitle = (title || '').trim() || 'Racing Room'
    socketRef.current.emit('createRoom', name, fallbackTitle, ({ roomId, isHost, title: serverTitle, racers: initialRacers }) => {
      setRoomId(roomId)
      setPrefilledRoomId(roomId)
      setIsHost(isHost)
      isHostRef.current = isHost
      const resolvedTitle = serverTitle || fallbackTitle
      setRoomTitle(resolvedTitle)
      roomTitleRef.current = resolvedTitle
      if (Array.isArray(initialRacers)) {
        const hydrated = hydrateRacers(initialRacers)
        racersRef.current = hydrated
        setRacers(hydrated)
      }
      setGameState('lobby')
    })
  }

  const joinRoom = (roomId, name) => {
    socketRef.current.emit('joinRoom', { roomId, name }, ({ success, error, racers: serverRacers, title: serverTitle }) => {
      if (success) {
        setRoomId(roomId)
        setPrefilledRoomId(roomId)
        setIsHost(false)
        isHostRef.current = false
        if (typeof serverTitle === 'string') {
          setRoomTitle(serverTitle)
          roomTitleRef.current = serverTitle
        }
        if (Array.isArray(serverRacers)) {
          const hydrated = hydrateRacers(serverRacers)
          setRacers(hydrated)
          racersRef.current = hydrated
        }
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

  const handleReuseRoom = () => {
    const nextTitle = window.prompt('Enter game title for the next race', roomTitle || 'Racing Room') || roomTitleRef.current || 'Racing Room'
    const safeTitle = nextTitle.trim() || 'Racing Room'

    if(!safeTitle) return

    const existingName = racers.find(r => r.id === socketRef.current.id)?.name || ''
    const nextName = window.prompt('Enter your racer name for the next race', existingName) || ''
    const safeName = nextName.trim()
    if (!safeName) return


    socketRef.current.emit('resetRoom', { roomId, hostName: safeName, title: safeTitle }, (resp) => {
      if (resp?.success && Array.isArray(resp.racers)) {
        setIsHost(true)
        isHostRef.current = true
        setWinner(null)
        winnerRef.current = null
        finishOrderRef.current = 1
        const hydrated = hydrateRacers(resp.racers)
        racersRef.current = hydrated
        setRacers(hydrated)
        if (resp.title) {
          setRoomTitle(resp.title)
          roomTitleRef.current = resp.title
        } else {
          setRoomTitle(safeTitle)
          roomTitleRef.current = safeTitle
        }
        setGameState('lobby')
        setCountdown(null)
      } else if (resp?.error) {
        alert(resp.error)
      }
    })
  }

  const handleExitRoom = () => {
    socketRef.current.emit('closeRoom', roomId, () => {
      setWinner(null)
      winnerRef.current = null
      setRacers([])
      racersRef.current = []
      setIsHost(false)
      isHostRef.current = false
      setRoomId('')
      setPrefilledRoomId('')
      setRoomTitle('')
      gameStateRef.current = 'menu'
      setGameState('menu')
    })
  }

  const handleUpdateTitle = (title) => {
    if (!isHostRef.current || !roomIdRef.current) return
    const safeTitle = (title || '').trim()
    socketRef.current.emit('setTitle', { roomId: roomIdRef.current, title: safeTitle || roomTitleRef.current || 'Racing Room' }, (resp) => {
      if (resp?.success && resp.title) {
        setRoomTitle(resp.title)
        roomTitleRef.current = resp.title
      }
    })
  }

  const handlePeekRoom = (maybeRoomId) => {
    const id = (maybeRoomId || '').trim().toUpperCase()
    if (!id || id.length < 3) {
      setPeekRacers([])
      setPeekTitle('')
      pendingPeekIdRef.current = ''
      return
    }
    // If socket not ready yet, queue a peek and exit
    if (!socketRef.current || !socketRef.current.connected) {
      pendingPeekIdRef.current = id
      return
    }
    pendingPeekIdRef.current = ''
    socketRef.current.emit('peekRoom', { roomId: id }, (resp) => {
      if (resp?.racers) {
        setPeekRacers(resp.racers)
        if (resp.title) setPeekTitle(resp.title)
      } else {
        setPeekRacers([])
        setPeekTitle('')
      }
    })
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
        <SetupScreen
          onCreateRoom={createRoom}
          onJoinRoom={joinRoom}
          prefilledRoomId={prefilledRoomId || inviteRoomId}
          onPeekRoom={handlePeekRoom}
          peekRacers={peekRacers}
          peekTitle={peekTitle}
        />
      )}

      {(gameState === 'lobby' || gameState === 'countdown') && (
        <Lobby
          key={`${roomId || 'lobby'}-${roomTitle || 'title'}`}
          roomId={roomId}
          racers={racers}
          isHost={isHost}
          onStartRace={startRace}
          isStarting={gameState === 'countdown'}
          roomTitle={roomTitle}
          onUpdateTitle={handleUpdateTitle}
        />
      )}

      {(gameState === 'racing' || gameState === 'finished') && (
        <>
          {roomTitle && (
            <div className="game-title-badge">
              {roomTitle}
            </div>
          )}
          <Timer ref={timerRef} />
          <MiniMap
            racers={racers}
            trackLength={TRACK_LENGTH}
            onRegisterDotRef={registerMiniMapRef}
          />
          <Background />
          <RaceTrack
            ref={trackContainerRef}
            racers={racers}
            trackLength={TRACK_LENGTH}
            onRegisterRacerRef={registerRacerRef}
          />
          <GameControls racers={racers} onBoost={handleBoost} />
        </>
      )}

      {gameState === 'finished' && (
        <Celebration
          winner={winner || racers.find(r => r.place === 1) || racers[0]}
          isHost={isHost}
          onReuseRoom={handleReuseRoom}
          onExitRoom={handleExitRoom}
          onReload={() => window.location.reload()}
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
