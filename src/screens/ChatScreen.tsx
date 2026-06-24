import { useEffect, useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { BottomNav } from '../components/shared/BottomNav'
import { useVoiceRecorder } from '../components/voice/useVoiceRecorder'
import { useUser } from '../context/UserContext'
import { speakText, transcribeAudio } from '../lib/openai'

const suggestedPrompts = [
  'Why do I keep feeling foggy even when I sleep well?',
  'Is what I am experiencing normal for this experiment?',
  'What should I try next based on my results?',
  'I had a bad day. What does my data say?',
]

export function ChatScreen() {
  const { profile, chatHistory, sendChatMessage, addExperimentIdeasFromChat } = useUser()
  const { isRecording, startRecording, stopRecording } = useVoiceRecorder()
  const [searchParams] = useSearchParams()
  const [input, setInput] = useState('')
  const [voiceMode, setVoiceMode] = useState(false)
  const [sending, setSending] = useState(false)
  const [savingMessageId, setSavingMessageId] = useState<string | null>(null)
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null)
  const [saveResultByMessage, setSaveResultByMessage] = useState<Record<string, string>>({})

  const prefixedPrompt = useMemo(() => searchParams.get('prompt') ?? '', [searchParams])
  const fromExperiment = searchParams.get('source') === 'experiment'

  useEffect(() => {
    if (prefixedPrompt && !input) {
      setInput(prefixedPrompt)
    }
  }, [prefixedPrompt, input])

  if (!profile) return <Navigate to="/onboarding" replace />

  const submit = async (message: string) => {
    if (!message.trim()) return
    setSending(true)
    const reply = await sendChatMessage(message)
    setInput('')
    setSending(false)

    if (voiceMode && reply) {
      await speakText(reply)
    }
  }

  const toggleRecord = async () => {
    if (!isRecording) {
      await startRecording()
      return
    }
    const blob = await stopRecording()
    const text = await transcribeAudio(blob)
    setInput(text)
  }

  const saveIdea = async (messageId: string, content: string) => {
    setSavingMessageId(messageId)
    const added = await addExperimentIdeasFromChat(content)
    setSaveResultByMessage((prev) => ({
      ...prev,
      [messageId]: added > 0 ? `Added ${added} option${added > 1 ? 's' : ''} to Experiment page` : 'No new option found',
    }))
    setSavingMessageId(null)
  }

  const speakMessage = async (messageId: string, content: string) => {
    setSpeakingMessageId(messageId)
    await speakText(content)
    setSpeakingMessageId(null)
  }

  return (
    <main className="mobile-shell stack has-nav">
      <section className="card row">
        <div>
          <h1>Nouri</h1>
          <p className="muted">Knows your health data</p>
        </div>
        <button className="small" onClick={() => setVoiceMode((prev) => !prev)}>
          {voiceMode ? 'Voice On' : 'Voice Off'}
        </button>
      </section>

      {fromExperiment && (
        <section className="card stack">
          <p className="muted">You came from Experiment page.</p>
          <button
            className="small"
            disabled={sending}
            onClick={() =>
              submit(
                'Give me 3 new personalised 7-day experiment ideas I can choose from. For each: title, one daily action, and why it might work for me.',
              )
            }
          >
            Generate 3 new experiment ideas
          </button>
        </section>
      )}

      <section className="card chat-thread">
        {!chatHistory.length && (
          <div className="stack">
            <p className="muted">Try one:</p>
            {suggestedPrompts.map((prompt) => (
              <button key={prompt} className="chip" onClick={() => setInput(prompt)}>
                {prompt}
              </button>
            ))}
          </div>
        )}

        {chatHistory.map((message) => (
          <div key={message.id} className="stack compact">
            <div className={`bubble ${message.role}`}>{message.content}</div>
            {message.role === 'assistant' && (
              <div className="row">
                <button className="small" disabled={speakingMessageId === message.id} onClick={() => void speakMessage(message.id, message.content)}>
                  {speakingMessageId === message.id ? 'Playing...' : 'Listen'}
                </button>
                <button
                  className="small"
                  disabled={savingMessageId === message.id}
                  onClick={() => void saveIdea(message.id, message.content)}
                >
                  {savingMessageId === message.id ? 'Saving...' : 'Add idea to experiments'}
                </button>
                {saveResultByMessage[message.id] && <p className="muted">{saveResultByMessage[message.id]}</p>}
              </div>
            )}
          </div>
        ))}
        {sending && <p className="muted">Nouri is thinking...</p>}
      </section>

      <section className="card row">
        <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask Nouri..." />
        <button className="small" onClick={toggleRecord}>
          {isRecording ? 'Stop' : 'Mic'}
        </button>
        <button className="small" disabled={sending} onClick={() => submit(input)}>
          Send
        </button>
      </section>

      <BottomNav />
    </main>
  )
}
