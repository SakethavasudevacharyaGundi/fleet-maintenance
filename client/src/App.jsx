import { useState, useEffect } from 'react'
import axios from 'axios'
import './App.css'

function App() {
  const [health, setHealth] = useState('Checking server health...')

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_API_URL}/health`)
        setHealth(response.data.message)
      } catch (error) {
        setHealth('Server is down or unreachable')
        console.error(error)
      }
    }
    checkHealth()
  }, [])

  return (
    <>
      <section id="center">
        <div>
          <h1>Fleet Maintenance App</h1>
          <p>
            Server Status: <strong>{health}</strong>
          </p>
        </div>
      </section>
    </>
  )
}

export default App
