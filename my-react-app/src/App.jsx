import React, { useState, useEffect, useRef } from 'react';
import './App.css';

const THEMES = [
  { id: 'cosmic', name: 'Cosmic Indigo', accent: '#818cf8' },
  { id: 'emerald', name: 'Aurora Emerald', accent: '#34d399' },
  { id: 'sunset', name: 'Solar Flare', accent: '#fb7185' },
  { id: 'cyber', name: 'Cyber Cyan', accent: '#22d3ee' },
];

function calculateTimeLeft(targetISO) {
  const difference = new Date(targetISO).getTime() - Date.now();

  if (difference <= 0) {
    return {
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isComplete: true,
    };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    isComplete: false,
  };
}

function calculateProgress(startISO, targetISO) {
  const start = new Date(startISO).getTime();
  const target = new Date(targetISO).getTime();
  const now = Date.now();

  if (now >= target) return 100;
  if (now <= start || target <= start) return 0;

  const pct = ((now - start) / (target - start)) * 100;
  return Number(Math.min(100, Math.max(0, pct)).toFixed(1));
}

function padZero(num) {
  return String(num).padStart(2, '0');
}

function ConfettiOverlay() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const colors = ['#818cf8', '#34d399', '#fb7185', '#fbbf24', '#22d3ee'];
    const particles = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: Math.random() * 2 - 1,
      rotation: Math.random() * 360,
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += 3;

        if (p.y > canvas.height) {
          p.y = -10;
          p.x = Math.random() * canvas.width;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="confetti-overlay" />;
}

export default function App() {
  const [eventData, setEventData] = useState(() => {
    try {
      const saved = localStorage.getItem('activeCountdownEvent');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [theme, setTheme] = useState('cosmic');
  const [error, setError] = useState('');

  const [timeLeft, setTimeLeft] = useState(() =>
    eventData ? calculateTimeLeft(eventData.targetISO) : null
  );
  const [progress, setProgress] = useState(() =>
    eventData ? calculateProgress(eventData.createdAt, eventData.targetISO) : 0
  );
  const [isCelebrating, setIsCelebrating] = useState(false);

  useEffect(() => {
    if (eventData) {
      localStorage.setItem('activeCountdownEvent', JSON.stringify(eventData));
    } else {
      localStorage.removeItem('activeCountdownEvent');
    }
  }, [eventData]);

  useEffect(() => {
    if (!eventData) return;

    const updateTimer = () => {
      const updated = calculateTimeLeft(eventData.targetISO);
      setTimeLeft(updated);
      setProgress(calculateProgress(eventData.createdAt, eventData.targetISO));
      if (updated.isComplete) {
        setIsCelebrating(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [eventData]);

  const applyPreset = (minutesToAdd, presetLabel) => {
    const future = new Date(Date.now() + minutesToAdd * 60 * 1000);
    const yyyy = future.getFullYear();
    const mm = String(future.getMonth() + 1).padStart(2, '0');
    const dd = String(future.getDate()).padStart(2, '0');
    const hh = String(future.getHours()).padStart(2, '0');
    const min = String(future.getMinutes()).padStart(2, '0');

    setDate(`${yyyy}-${mm}-${dd}`);
    setTime(`${hh}:${min}`);
    if (!title.trim()) setTitle(presetLabel);
    setError('');
  };

  const handleStartEvent = (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setError('Please enter an event name.');
      return;
    }
    if (!date) {
      setError('Please select a target date.');
      return;
    }

    const targetDateTime = new Date(`${date}T${time || '00:00'}:00`);
    if (isNaN(targetDateTime.getTime()) || targetDateTime <= new Date()) {
      setError('Please pick a date and time in the future.');
      return;
    }

    const newEvent = {
      title: title.trim(),
      date,
      time: time || '00:00',
      targetISO: targetDateTime.toISOString(),
      createdAt: new Date().toISOString(),
      theme,
    };

    setError('');
    setIsCelebrating(false);
    setEventData(newEvent);
    setTimeLeft(calculateTimeLeft(newEvent.targetISO));
    setProgress(calculateProgress(newEvent.createdAt, newEvent.targetISO));
  };

  const handleReset = () => {
    setIsCelebrating(false);
    setEventData(null);
    setTimeLeft(null);
    setProgress(0);
  };

  const activeTheme = eventData?.theme || theme;

  const formattedTarget = eventData
    ? new Date(eventData.targetISO).toLocaleString(undefined, {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const units = timeLeft
    ? [
        { label: 'DAYS', value: padZero(timeLeft.days) },
        { label: 'HOURS', value: padZero(timeLeft.hours) },
        { label: 'MINUTES', value: padZero(timeLeft.minutes) },
        { label: 'SECONDS', value: padZero(timeLeft.seconds) },
      ]
    : [];

  return (
    <div className={`app-container theme-${activeTheme}`}>
      <div className="ambient-glow glow-1" />
      <div className="ambient-glow glow-2" />

      {isCelebrating && <ConfettiOverlay />}

      <main className="main-wrapper">
        {!eventData ? (
          <div className="glass-card form-card">
            <div className="badge">EVENT COUNTDOWN</div>
            <h1>Set Your Milestone</h1>
            <p className="subtitle">
              Enter your event name, date, and time to start the live countdown.
            </p>

            <form onSubmit={handleStartEvent} className="event-form">
              <div className="input-group">
                <label htmlFor="event-title">Event Name</label>
                <input
                  id="event-title"
                  type="text"
                  placeholder="e.g., Product Launch, Trip to Goa, Exam Day..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="row-inputs">
                <div className="input-group">
                  <label htmlFor="event-date">Target Date</label>
                  <input
                    id="event-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="event-time">Target Time</label>
                  <input
                    id="event-time"
                    type="time"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>

              <div className="presets">
                <span>Quick Presets:</span>
                <button type="button" onClick={() => applyPreset(1, '1-Minute Test')}>
                  +1 Min
                </button>
                <button type="button" onClick={() => applyPreset(60, '1-Hour Sprint')}>
                  +1 Hour
                </button>
                <button type="button" onClick={() => applyPreset(1440, 'Tomorrow Event')}>
                  +24 Hours
                </button>
                <button type="button" onClick={() => applyPreset(10080, 'Next Week Event')}>
                  +7 Days
                </button>
              </div>

              <div className="input-group">
                <label>Theme Atmosphere</label>
                <div className="theme-selector">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className={`theme-chip ${theme === t.id ? 'active' : ''}`}
                      onClick={() => setTheme(t.id)}
                    >
                      <span className="dot" style={{ backgroundColor: t.accent }} />
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {error && <div className="error-banner">{error}</div>}

              <button type="submit" className="primary-btn">
                Start Countdown →
              </button>
            </form>
          </div>
        ) : (
          <div className="glass-card countdown-card">
            <div className="badge">
              {timeLeft?.isComplete ? 'EVENT ARRIVED' : 'LIVE COUNTDOWN'}
            </div>

            <h1 className="event-heading">{eventData.title}</h1>
            <p className="target-date">Target: {formattedTarget}</p>

            {timeLeft?.isComplete ? (
              <div className="celebration-box">
                <h2>The wait is over!</h2>
                <p>{eventData.title} has officially arrived.</p>
              </div>
            ) : (
              <div className="timer-grid">
                {units.map((unit) => (
                  <div key={unit.label} className="time-unit">
                    <div className="digit-box">
                      <div className="split-line" />
                      <span key={unit.value} className="digit-value">
                        {unit.value}
                      </span>
                    </div>
                    <span className="unit-label">{unit.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="progress-section">
              <div className="progress-header">
                <span>Journey Progress</span>
                <span>{progress}%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="actions-row">
              <button type="button" onClick={handleReset} className="secondary-btn">
                ← New Event
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}