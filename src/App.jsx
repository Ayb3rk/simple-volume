import React, { useEffect, useState } from 'react'
import './index.css'

export default function App() {
  const [tabs, setTabs] = useState([])

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

  return (
    <>
      <header className="p-6 pb-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold">Simple Volume</h1>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-6" id="tab-list">
        {tabs.length === 0 ? (
          <p className="text-sm text-gray-400">No media tabs found.</p>
        ) : (
          tabs.map((tab, index) => (
            <React.Fragment key={tab.id}>
              <TabController tab={tab} />
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
    </>
  )
}

function TabController({ tab }) {
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)

  useEffect(() => {
    chrome.storage.local.get([`tab-${tab.id}`], (result) => {
      const state = result[`tab-${tab.id}`] || { volume: 0.5, isMuted: false }
      setVolume(state.volume)
      setIsMuted(state.isMuted)
      injectVolume(tab.id, state.volume, state.isMuted)
    })
  }, [tab.id])

  const updateVolume = (vol, mute) => {
    setVolume(vol)
    setIsMuted(mute)
    chrome.storage.local.set({ [`tab-${tab.id}`]: { volume: vol, isMuted: mute } })
    injectVolume(tab.id, vol, mute)
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
            className={`w-full cursor-pointer ${
              gain > 1 ? 'accent-red-500' : 'accent-pink-500'
            }`}
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
