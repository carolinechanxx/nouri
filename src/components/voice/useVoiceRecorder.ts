import { useRef, useState } from 'react'

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const recorder = new MediaRecorder(stream)
    chunksRef.current = []
    recorder.ondataavailable = (event) => chunksRef.current.push(event.data)
    recorder.start()
    mediaRecorderRef.current = recorder
    setIsRecording(true)
  }

  const stopRecording = () =>
    new Promise<Blob>((resolve) => {
      const recorder = mediaRecorderRef.current
      if (!recorder) {
        resolve(new Blob())
        return
      }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        resolve(blob)
      }
      recorder.stop()
      setIsRecording(false)
    })

  return { isRecording, startRecording, stopRecording }
}
