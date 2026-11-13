
import { useState } from 'react'
import './App.css'

const fixedProcesses = [
  { pid: 1, arrivalTime: 0, burstTime: 7 },
  { pid: 2, arrivalTime: 1, burstTime: 5 },
  { pid: 3, arrivalTime: 2, burstTime: 4 },
  { pid: 4, arrivalTime: 3, burstTime: 6 },
]

function simulate(input, duration) {
  const processes = input.map(p => ({
    ...p,
    remainingTime: p.burstTime,
    currentQueue: 0,
    quantumUsed: 0,
    completionTime: null,
  }))

  const queues = [[], [], []]
  const gantt = []
  let time = 0
  let running = null

  while (time < duration) {
    processes.forEach((p, i) => {
      if (p.arrivalTime === time) queues[0].push(i)
    })

    if (running !== null) {
      const higher = queues.findIndex(q => q.length > 0)

      if (
        higher !== -1 &&
        higher < processes[running].currentQueue
      ) {
        queues[processes[running].currentQueue].unshift(running)
        running = null
      }
    }

    if (running === null) {
      const level = queues.findIndex(q => q.length > 0)
      if (level !== -1) running = queues[level].shift()
    }

    if (running === null) {
      const last = gantt[gantt.length - 1]

      if (last && last.pid === 'IDLE' && last.end === time) {
        last.end++
      } else {
        gantt.push({
          pid: 'IDLE',
          queue: -1,
          start: time,
          end: time + 1,
        })
      }

      time++
      continue
    }

    const p = processes[running]
    const level = p.currentQueue
    const last = gantt[gantt.length - 1]

    if (
      last &&
      last.pid === p.pid &&
      last.queue === level &&
      last.end === time
    ) {
      last.end++
    } else {
      gantt.push({
        pid: p.pid,
        queue: level,
        start: time,
        end: time + 1,
      })
    }

    p.remainingTime--
    p.quantumUsed++
    time++

    if (p.remainingTime === 0) {
      p.completionTime = time
      running = null
    } else if (level < 2 && p.quantumUsed >= 3) {
      p.currentQueue++
      p.quantumUsed = 0
      queues[p.currentQueue].push(running)
      running = null
    }
  }

  const results = processes.map(p => {
    const completed = p.completionTime !== null

    const turnaround = completed
      ? p.completionTime - p.arrivalTime
      : null

    return {
      ...p,
      waitingTime: completed ? turnaround - p.burstTime : null,
      turnaroundTime: turnaround,
      completed,
    }
  })

  const completedProcesses = results.filter(p => p.completed)

  return {
    results,
    gantt,
    duration,
    avgWaiting: completedProcesses.length
      ? completedProcesses.reduce(
          (sum, p) => sum + p.waitingTime, 0
        ) / completedProcesses.length
      : 0,
    avgTurnaround: completedProcesses.length
      ? completedProcesses.reduce(
          (sum, p) => sum + p.turnaroundTime, 0
        ) / completedProcesses.length
      : 0,
  }
}

function App() {
  const [mode, setMode] = useState('fixed')
  const [duration, setDuration] = useState('30')
  const [count, setCount] = useState('5')
  const [simulation, setSimulation] = useState(null)
  const [error, setError] = useState('')
  const [activeSection, setActiveSection] = useState('dashboard')
  const [currentStep, setCurrentStep] = useState(0)
  const [detailView, setDetailView] = useState(null)

  function navigateToSection(sectionId) {
    setActiveSection(sectionId)
    document.getElementById(sectionId)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  }

  function runSimulation() {
    const simulationDuration = Number(duration)

    if (
      duration.trim() === '' ||
      !Number.isInteger(simulationDuration) ||
      simulationDuration < 1
    ) {
      setError('Please enter a valid simulation duration.')
      return
    }

    const processCount = Number(count)

    if (
      mode === 'random' &&
      (
        count.trim() === '' ||
        !Number.isInteger(processCount) ||
        processCount < 1 ||
        processCount > 30
      )
    ) {
      setError('Enter a number of processes between 1 and 30.')
      return
    }

    const processes = mode === 'fixed'
      ? fixedProcesses
      : Array.from({ length: processCount }, (_, i) => ({
          pid: i + 1,
          arrivalTime: Math.floor(
            Math.random() * Math.min(11, simulationDuration)
          ),
          burstTime: Math.floor(Math.random() * 15) + 1,
        })).sort((a, b) => a.arrivalTime - b.arrivalTime)

    setError('')
    setSimulation(simulate(processes, simulationDuration))
    setCurrentStep(0)
    setDetailView(null)
  }

  function resetSimulation() {
    setSimulation(null)
    setCurrentStep(0)
    setDetailView(null)
    setError('')
  }

  const results = simulation?.results || []
  const completedProcesses = results.filter(p => p.completed)
  const uncompletedProcesses = results.filter(p => !p.completed)
  const completed = completedProcesses.length
  const elapsedTime = simulation ? simulation.duration : 0
  const cpuBusyTime = simulation ? simulation.gantt.filter(e => e.pid !== 'IDLE').reduce((sum, e) => sum + e.end - e.start, 0) : 0
  const cpuIdleTime = simulation ? elapsedTime - cpuBusyTime : 0
  const executionSteps = simulation?.gantt || []
  const activeStep = executionSteps[currentStep] || null
  const stepMessage = !activeStep
    ? 'Run a simulation to explore its execution.'
    : activeStep.pid === 'IDLE'
      ? `CPU is idle from time ${activeStep.start} to ${activeStep.end}. No process is ready.`
      : `Process P${activeStep.pid} executes in Queue ${activeStep.queue + 1} from time ${activeStep.start} to ${activeStep.end}.`

  return (
    <div className="app">

      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">CPU</div>
          <div>
            <h2>OS Scheduler</h2>
            <span>PROCESS MANAGEMENT</span>
          </div>
        </div>

        <p className="side-label">MAIN MENU</p>

        <button
          type="button"
          className={`nav-item ${activeSection === 'dashboard' ? 'active' : ''}`}
          onClick={() => navigateToSection('dashboard')}
          style={{ width: '100%', border: 0, background: 'transparent', color: 'inherit', appearance: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
        >
          ▦ &nbsp; Dashboard
        </button>
        <button
          type="button"
          className={`nav-item ${activeSection === 'scheduling' ? 'active' : ''}`}
          onClick={() => navigateToSection('scheduling')}
          style={{ width: '100%', border: 0, background: 'transparent', color: 'inherit', appearance: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
        >
          ◷ &nbsp; Scheduling
        </button>
        <button
          type="button"
          className={`nav-item ${activeSection === 'process-table' ? 'active' : ''}`}
          onClick={() => navigateToSection('process-table')}
          style={{ width: '100%', border: 0, background: 'transparent', color: 'inherit', appearance: 'none', textAlign: 'left', cursor: 'pointer', font: 'inherit' }}
        >
          ▤ &nbsp; Process Table
        </button>


        <div className="sidebar-bottom">
          <span className="status-dot"></span>
          Simulator Ready
        </div>
      </aside>

      <main className="main" id="dashboard">

        <header className="topbar">
          <div>
            <p className="breadcrumb">
              OPERATING SYSTEM / SCHEDULING
            </p>
            <h1>CPU Scheduling Dashboard</h1>
          </div>
          <span className="top-status">● SYSTEM ONLINE</span>
        </header>

        <section className="welcome">
          <div>
            <span className="eyebrow">
              MULTILEVEL FEEDBACK QUEUE
            </span>
            <h2>Scheduling Simulator</h2>
            <p>
              Visualize process execution, queue movement and CPU performance.
            </p>
          </div>
          <div className="cpu-art">⚙</div>
        </section>

        <section className="stats">
          <button type="button" className="stat-card result-card" style={{ width: '100%', color: 'inherit', font: 'inherit', textAlign: 'center', cursor: simulation ? 'pointer' : 'not-allowed', border: '1px solid #263957' }} onClick={() => setDetailView('all')} disabled={!simulation}>
            <span>Total Processes</span>
            <strong>{results.length}</strong>
            <small>{simulation ? 'Click to inspect all processes' : 'Run a simulation first'}</small>
          </button>

          <button type="button" className="stat-card result-card" style={{ width: '100%', color: 'inherit', font: 'inherit', textAlign: 'center', cursor: simulation ? 'pointer' : 'not-allowed', border: '1px solid #263957' }} onClick={() => setDetailView('completed')} disabled={!simulation}>
            <span>Completed</span>
            <strong className="green">{completed}</strong>
            <small>{simulation ? 'Click to inspect completed processes' : 'Run a simulation first'}</small>
          </button>

          <button type="button" className="stat-card result-card" style={{ width: '100%', color: 'inherit', font: 'inherit', textAlign: 'center', cursor: simulation ? 'pointer' : 'not-allowed', border: '1px solid #263957' }} onClick={() => setDetailView('uncompleted')} disabled={!simulation}>
            <span>Uncompleted</span>
            <strong className="orange">{results.length - completed}</strong>
            <small>{simulation ? 'Click to inspect unfinished processes' : 'Run a simulation first'}</small>
          </button>

          <button type="button" className="stat-card result-card" style={{ width: '100%', color: 'inherit', font: 'inherit', textAlign: 'center', cursor: simulation ? 'pointer' : 'not-allowed', border: '1px solid #263957' }} onClick={() => setDetailView('time')} disabled={!simulation}>
            <span>Simulation Time</span>
            <strong>{elapsedTime}</strong>
            <small>{simulation ? 'Click to inspect execution time' : 'Run a simulation first'}</small>
          </button>
        </section>

        <section className="panel" id="scheduling" style={{ scrollMarginTop: 24 }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">CONFIGURATION</span>
              <h3>Simulation Controls</h3>
            </div>
            <span className="tag">MLFQ ALGORITHM</span>
          </div>

          <div className="control-grid">
            <label>
              Simulation Mode
              <select
                value={mode}
                onChange={e => {
                  setMode(e.target.value)
                  setSimulation(null)
                  setError('')
                }}
              >
                <option value="fixed">Fixed Burst Times</option>
                <option value="random">Randomized Burst Times</option>
              </select>
            </label>

            <label>
              Simulation Duration
              <input
                type="text"
                inputMode="numeric"
                value={duration}
                placeholder="Enter simulation duration"
                onChange={e => {
                  setDuration(e.target.value)
                  setError('')
                }}
              />
            </label>

            {mode === 'random' && (
              <label>
                Number of Processes
                <input
                  type="text"
                  inputMode="numeric"
                  value={count}
                  placeholder="Enter number of processes"
                  onChange={e => {
                    setCount(e.target.value)
                    setError('')
                  }}
                />
              </label>
            )}
          </div>

          {error && (
            <p className="warning-message" style={{ marginTop: 15 }}>
              {error}
            </p>
          )}

          <div className="button-row">
            <button className="primary-btn" onClick={runSimulation}>
              ▶ &nbsp; Run Simulation
            </button>

            <button className="secondary-btn" onClick={resetSimulation}>
              ↻ &nbsp; Reset
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">PRIORITY MANAGEMENT</span>
              <h3>Multilevel Feedback Queues</h3>
            </div>
            <span className="tag">3 QUEUES</span>
          </div>

          <div className="queue-grid">
            <div className="queue-card q1">
              <span className="priority high">HIGH PRIORITY</span>
              <h4>Queue 1</h4>
              <p>Round Robin · Quantum 3</p>
              <strong>
                {results.filter(
                  p => p.currentQueue === 0 && !p.completed
                ).length}
              </strong>
              <small>Processes remaining</small>
            </div>

            <div className="queue-card q2">
              <span className="priority medium">MEDIUM PRIORITY</span>
              <h4>Queue 2</h4>
              <p>Round Robin · Quantum 3</p>
              <strong>
                {results.filter(
                  p => p.currentQueue === 1 && !p.completed
                ).length}
              </strong>
              <small>Processes remaining</small>
            </div>

            <div className="queue-card q3">
              <span className="priority low">LOW PRIORITY</span>
              <h4>Queue 3</h4>
              <p>First Come First Serve</p>
              <strong>
                {results.filter(
                  p => p.currentQueue === 2 && !p.completed
                ).length}
              </strong>
              <small>Processes remaining</small>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CPU EXECUTION</span>
              <h3>Gantt Chart</h3>
            </div>
            <span className="tag">TIMELINE</span>
          </div>

          {!simulation ? (
            <div className="empty-state">
              <div className="empty-icon">▥</div>
              <h4>No simulation data yet</h4>
              <p>Choose your settings and click Run Simulation.</p>
            </div>
          ) : (
            <div className="gantt-wrapper">
              <div className="gantt">
                {simulation.gantt.map((entry, i) => (
                  <div
                    key={i}
                    className={`gantt-block ${
                      entry.pid === 'IDLE'
                        ? 'idle'
                        : `level-${entry.queue}`
                    }`}
                    style={{
                      flex: entry.end - entry.start,
                      ...(i === currentStep ? { outline: '3px solid #ffffff', outlineOffset: '3px', transform: 'translateY(-3px)' } : {}),
                      transition: 'all 180ms ease',
                    }}
                  >
                    <strong>
                      {entry.pid === 'IDLE'
                        ? 'IDLE'
                        : `P${entry.pid}`}
                    </strong>
                    {entry.pid !== 'IDLE' && (
                      <small>Q{entry.queue + 1}</small>
                    )}
                  </div>
                ))}
              </div>

              <div className="time-labels">
                {simulation.gantt.map((entry, i) => (
                  <span key={i}>{entry.start}</span>
                ))}
                <span>{simulation.gantt.at(-1)?.end ?? 0}</span>
              </div>
            </div>
          )}
        </section>

        <section className="panel" id="step-replay" style={{ scrollMarginTop: 24 }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">INTERACTIVE LEARNING</span>
              <h3>Step-by-Step Execution</h3>
            </div>
            <span className="tag">{simulation ? `STEP ${currentStep + 1} / ${executionSteps.length}` : 'WAITING'}</span>
          </div>

          <div style={{ background: '#0d1729', border: '1px solid #263957', borderRadius: 12, padding: 18 }}>
            <p style={{ color: '#c8d8f5', margin: '0 0 14px', lineHeight: 1.6 }} aria-live="polite">
              {stepMessage}
            </p>
            <div className="button-row" style={{ marginTop: 0 }}>
              <button
                className="secondary-btn"
                type="button"
                disabled={!simulation || currentStep === 0}
                onClick={() => setCurrentStep(step => Math.max(0, step - 1))}
              >
                ← Previous
              </button>
              <button
                className="primary-btn"
                type="button"
                disabled={!simulation || currentStep >= executionSteps.length - 1}
                onClick={() => setCurrentStep(step => Math.min(executionSteps.length - 1, step + 1))}
              >
                Next Step →
              </button>
              <button
                className="secondary-btn"
                type="button"
                disabled={!simulation}
                onClick={() => setCurrentStep(0)}
              >
                ↺ Start Again
              </button>
            </div>
          </div>

          <div style={{ marginTop: 20 }}>
            <div className="section-heading" style={{ marginBottom: 12 }}>
              <div>
                <span className="eyebrow">EXECUTION HISTORY</span>
                <h3>Process Event Log</h3>
              </div>
              <span className="tag">{executionSteps.length} EVENTS</span>
            </div>
            {!simulation ? (
              <p className="table-empty">Run a simulation to generate the event log.</p>
            ) : (
              <div style={{ display: 'grid', gap: 8, maxHeight: 260, overflowY: 'auto' }}>
                {executionSteps.map((entry, index) => (
                  <button
                    key={`${entry.start}-${entry.end}-${index}`}
                    type="button"
                    onClick={() => setCurrentStep(index)}
                    aria-current={index === currentStep ? 'step' : undefined}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                      textAlign: 'left', padding: '11px 14px', borderRadius: 9,
                      border: index === currentStep ? '1px solid #8b5cf6' : '1px solid #263957',
                      background: index === currentStep ? 'rgba(124, 87, 230, 0.18)' : '#111e32',
                      color: '#dce8ff', cursor: 'pointer', font: 'inherit',
                    }}
                  >
                    <span>
                      <strong style={{ color: entry.pid === 'IDLE' ? '#aab8ce' : '#b69aff' }}>
                        {entry.pid === 'IDLE' ? 'CPU IDLE' : `P${entry.pid} · Queue ${entry.queue + 1}`}
                      </strong>
                      <span style={{ display: 'block', color: '#91a9cf', fontSize: 13, marginTop: 3 }}>
                        Time {entry.start} – {entry.end}
                      </span>
                    </span>
                    <span style={{ color: '#9bb8e8', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {index === currentStep ? 'CURRENT STEP' : 'VIEW STEP'}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="panel" id="process-table" style={{ scrollMarginTop: 24 }}>
          <div className="section-heading">
            <div>
              <span className="eyebrow">PROCESS INFORMATION</span>
              <h3>Process Details</h3>
            </div>
            <span className="tag">{results.length} PROCESSES</span>
          </div>

          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Process</th>
                  <th>Arrival</th>
                  <th>Burst</th>
                  <th>Completion</th>
                  <th>Waiting</th>
                  <th>Turnaround</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {!simulation ? (
                  <tr>
                    <td colSpan="7" className="table-empty">
                      Run a simulation to view process details.
                    </td>
                  </tr>
                ) : (
                  results.map(p => (
                    <tr key={p.pid}>
                      <td className="process-name">P{p.pid}</td>
                      <td>{p.arrivalTime}</td>
                      <td>{p.burstTime}</td>
                      <td>{p.completionTime ?? '—'}</td>
                      <td>{p.waitingTime ?? '—'}</td>
                      <td>{p.turnaroundTime ?? '—'}</td>
                      <td>
                        <span
                          className={`status ${
                            p.completed ? 'done' : 'pending'
                          }`}
                        >
                          {p.completed ? 'Completed' : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="stats performance" id="performance" style={{ scrollMarginTop: 24 }}>
          <div className="stat-card">
            <span>Average Waiting Time</span>
            <strong>
              {simulation ? simulation.avgWaiting.toFixed(2) : '—'}
            </strong>
            <small>Completed processes only</small>
          </div>

          <div className="stat-card">
            <span>Average Turnaround Time</span>
            <strong>
              {simulation ? simulation.avgTurnaround.toFixed(2) : '—'}
            </strong>
            <small>Completed processes only</small>
          </div>
        </section>

        {detailView && simulation && (
          <div
            role="presentation"
            onMouseDown={e => { if (e.target === e.currentTarget) setDetailView(null) }}
            style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2, 8, 20, 0.78)', display: 'grid', placeItems: 'center', padding: 20 }}
          >
            <section role="dialog" aria-modal="true" aria-labelledby="result-dialog-title" style={{ width: 'min(1050px, 100%)', maxHeight: '85vh', overflowY: 'auto', background: '#101d31', color: '#e8f0ff', border: '1px solid #344765', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,.45)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, marginBottom: 18 }}>
                <div>
                  <span className="eyebrow">SIMULATION INSIGHTS</span>
                  <h2 id="result-dialog-title" style={{ margin: '7px 0 0', fontSize: 25 }}>
                    {detailView === 'all' ? 'All Generated Processes' : detailView === 'completed' ? 'Completed Processes' : detailView === 'uncompleted' ? 'Uncompleted Processes' : 'Simulation Time Breakdown'}
                  </h2>
                </div>
                <button type="button" className="secondary-btn" onClick={() => setDetailView(null)}>Close ✕</button>
              </div>

              {detailView === 'time' ? (
                <>
                  <p style={{ color: '#b8c9e4', lineHeight: 1.6 }}>The simulation clock starts at 0 and stops at the configured duration. CPU busy time is the sum of process execution intervals; idle time is when no process was ready.</p>
                  <div className="table-scroll"><table><tbody>
                    <tr><th>Start time</th><td>0</td></tr>
                    <tr><th>Configured duration</th><td>{simulation.duration} time units</td></tr>
                    <tr><th>CPU busy time</th><td>{cpuBusyTime} time units</td></tr>
                    <tr><th>CPU idle time</th><td>{cpuIdleTime} time units</td></tr>
                    <tr><th>End time</th><td>{elapsedTime}</td></tr>
                  </tbody></table></div>
                </>
              ) : (
                <>
                  <p style={{ color: '#b8c9e4', lineHeight: 1.6 }}>
                    {detailView === 'all' && 'These are the exact arrival and burst times supplied to this simulation.'}
                    {detailView === 'completed' && 'A process is completed when its remaining burst time reaches zero before the simulation ends.'}
                    {detailView === 'uncompleted' && `The simulation stopped at time ${simulation.duration}. These processes still had remaining CPU burst time at that point.`}
                  </p>
                  <div className="table-scroll"><table>
                    <thead><tr>
                      <th>Process</th><th>Arrival</th><th>Burst</th>
                      {detailView !== 'all' && <><th>Executed</th><th>Remaining</th><th>Final queue</th><th>Execution history</th><th>Explanation</th></>}
                      {detailView === 'completed' && <><th>Completion</th><th>Waiting</th><th>Turnaround</th></>}
                      {detailView === 'all' && <th>Status</th>}
                    </tr></thead>
                    <tbody>
                      {(detailView === 'all' ? results : detailView === 'completed' ? completedProcesses : uncompletedProcesses).length === 0 ? (
                        <tr><td colSpan="10" className="table-empty">No processes in this category.</td></tr>
                      ) : (detailView === 'all' ? results : detailView === 'completed' ? completedProcesses : uncompletedProcesses).map(p => {
                        const slices = simulation.gantt.filter(entry => entry.pid === p.pid)
                        const executed = p.burstTime - p.remainingTime
                        const history = slices.length ? slices.map(entry => `Q${entry.queue + 1}: ${entry.start}–${entry.end}`).join(' · ') : 'No CPU execution yet'
                        return (
                          <tr key={p.pid}>
                            <td className="process-name">P{p.pid}</td><td>{p.arrivalTime}</td><td>{p.burstTime}</td>
                            {detailView !== 'all' && <>
                              <td>{executed}</td><td>{p.remainingTime}</td><td>{p.completed ? 'Completed' : p.arrivalTime >= simulation.duration ? 'Not arrived' : `Q${p.currentQueue + 1}`}</td><td style={{ minWidth: 180 }}>{history}</td>
                              <td style={{ minWidth: 230 }}>{p.completed ? `Finished at time ${p.completionTime}; all ${p.burstTime} burst units were used.` : p.arrivalTime >= simulation.duration ? `Arrived at time ${p.arrivalTime}, which is outside the simulated interval (0 to ${simulation.duration}).` : `Received ${executed} of ${p.burstTime} CPU units. ${p.remainingTime} units remained when the simulation stopped at time ${simulation.duration}.`}</td>
                            </>}
                            {detailView === 'completed' && <><td>{p.completionTime}</td><td>{p.waitingTime}</td><td>{p.turnaroundTime}</td></>}
                            {detailView === 'all' && <td><span className={`status ${p.completed ? 'done' : 'pending'}`}>{p.completed ? 'Completed' : 'Uncompleted'}</span></td>}
                          </tr>
                        )
                      })}
                    </tbody>
                  </table></div>
                </>
              )}
              <p style={{ color: '#8fa8ce', fontSize: 12, marginTop: 16 }}>All values and explanations above are calculated from this run's simulation results.</p>
            </section>
          </div>
        )}

        <footer>
          <span>CPU SCHEDULING SIMULATOR</span>
          <span>
            Multilevel Feedback Queue · Operating Systems Project
          </span>
        </footer>

      </main>
    </div>
  )
}

export default App
