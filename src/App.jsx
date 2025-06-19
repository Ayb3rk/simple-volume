import React, { useEffect, useState } from 'react'
import './index.css'

export default function App() {
  const [tabs, setTabs] = useState([])
  const [globalMute, setGlobalMute] = useState(false)
  const [tabStates, setTabStates] = useState({}) // { tabId: { volume, isMuted } }

  useEffect(() => {
    chrome.tabs.query({}, async (allTabs) => {
      const results = await Promise.all(
        allTabs.map(async (tab) => {
          if (!tab.id || tab.url.startsWith('chrome://')) return null
          const hasMedia = await checkTabHasMedia(tab.id)
          return hasMedia ? tab : null
        })
      )
      setTabs(results.filter(Boolean))
    })
  }, [])

  const handleToggleMuteAll = () => {
    const nextMuteState = !globalMute
    setGlobalMute(nextMuteState)

    const updated = {}
    tabs.forEach((tab) => {
      const current = tabStates[tab.id] || { volume: 0.5, isMuted: false }
      updated[tab.id] = { volume: current.volume, isMuted: nextMuteState }

      chrome.storage.local.set({
        [`tab-${tab.id}`]: { volume: current.volume, isMuted: nextMuteState },
      })
      injectVolume(tab.id, current.volume, nextMuteState)
    })

    setTabStates(updated)
  }

  const resetAll = () => {
    setGlobalMute(false)
    const reset = {}
    tabs.forEach((tab) => {
      chrome.storage.local.set({
        [`tab-${tab.id}`]: { volume: 0.5, isMuted: false },
      })
      injectVolume(tab.id, 0.5, false)
      reset[tab.id] = { volume: 0.5, isMuted: false }
    })
    setTabStates(reset)
  }

  const updateTabState = (tabId, volume, isMuted) => {
    setTabStates((prev) => {
      const updated = { ...prev, [tabId]: { volume, isMuted } }

      // ⬇️ If any tab is not muted, disable global mute
      const allMuted = Object.values(updated).every((s) => s.isMuted)
      setGlobalMute(allMuted)

      return updated
    })
  }

  return (
    <div className="flex flex-col h-full">
      <header className="p-6 pb-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Volume Controller</h1>
      </header>

      <div className="flex justify-between px-6 pt-3 gap-4">
        <button
          onClick={handleToggleMuteAll}
          className="text-xs text-gray-200 px-3 py-1 bg-pink-600 rounded hover:bg-pink-700"
        >
          {globalMute ? 'Unmute All Tabs' : 'Mute All Tabs'}
        </button>
        <button
          onClick={resetAll}
          className="text-xs text-gray-200 px-3 py-1 bg-gray-600 rounded hover:bg-gray-700"
        >
          Reset All to 100%
        </button>
      </div>

      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-6" id="tab-list">
        {tabs.length === 0 ? (
          <p className="text-sm text-gray-400">No media tabs found.</p>
        ) : (
          tabs.map((tab, index) => (
            <React.Fragment key={tab.id}>
              <TabController
                tab={tab}
                globalMute={globalMute}
                onStateChange={updateTabState}
              />
              {index !== tabs.length - 1 && (
                <div className="border-t border-gray-700" />
              )}
            </React.Fragment>
          ))
        )}
      </main>

      <footer className="text-xs text-center text-gray-500 border-t border-gray-700 p-3">
        Built by ❤️ caju
      </footer>
    </div>
  )
}

function TabController({ tab, globalMute, onStateChange }) {
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    chrome.storage.local.get([`tab-${tab.id}`], (result) => {
      const state = result[`tab-${tab.id}`] || { volume: 0.5, isMuted: false }
      setVolume(state.volume)
      setIsMuted(state.isMuted)
      injectVolume(tab.id, state.volume, state.isMuted)
      onStateChange(tab.id, state.volume, state.isMuted)
    })
  }, [tab.id, globalMute])

  const updateVolume = (vol, mute) => {
    setVolume(vol)
    setIsMuted(mute)
    chrome.storage.local.set({ [`tab-${tab.id}`]: { volume: vol, isMuted: mute } })
    injectVolume(tab.id, vol, mute)
    onStateChange(tab.id, vol, mute)
  }

  const gain = isMuted ? 0 : (volume <= 0.5 ? volume * 2 : 1 + (volume - 0.5) * 4)
  const percent = Math.round(gain * 100)

  let icon = 'icons/full.svg'
  if (isMuted || gain === 0) icon = 'icons/muted.svg'
  else if (gain <= 0.66) icon = 'icons/low.svg'
  else if (gain <= 1.5) icon = 'icons/half.svg'

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 w-full">
        <img
          src={tab.favIconUrl || ''}
          alt=""
          className="w-5 h-5 rounded"
          onError={(e) => (e.target.style.display = 'none')}
        />
        <span className="text-sm truncate" title={tab.title}>
          {tab.title}
        </span>
      </div>

      <div className="flex items-center w-full gap-2">
        <div className="flex items-center gap-2 flex-grow">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => updateVolume(parseFloat(e.target.value), false)}
            className={`w-full cursor-pointer ${gain > 1 ? 'accent-red-500' : 'accent-pink-500'}`}
          />
          <span className="text-xs text-gray-400 text-right w-12">{percent}%</span>
        </div>
        <img
          src={icon}
          alt="Volume Icon"
          className="w-5 h-5 cursor-pointer transition-transform duration-200 hover:scale-110 brightness-[1.4]"
          onClick={() => updateVolume(volume, !isMuted)}
        />
      </div>
    </div>
  )
}

function checkTabHasMedia(tabId) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        func: () => !!document.querySelector('video, audio'),
      },
      (results) => resolve(results?.[0]?.result || false)
    )
  })
}

function injectVolume(tabId, volume, isMuted) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (volume, isMuted) => {
      document.querySelectorAll('video, audio').forEach((el) => {
        try {
          if (!el._boostAudioContext) {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)()
            const source = audioCtx.createMediaElementSource(el)
            const gainNode = audioCtx.createGain()
            source.connect(gainNode).connect(audioCtx.destination)
            el._boostAudioContext = { ctx: audioCtx, gain: gainNode }
          }

          const gainNode = el._boostAudioContext.gain
          const targetGain = isMuted ? 0 : volume <= 0.5 ? volume * 2 : 1 + (volume - 0.5) * 4
          gainNode.gain.value = targetGain
        } catch (e) {
          console.warn('Failed to apply audio boost', e)
        }
      })
    },
    args: [volume, isMuted],
  })
}
