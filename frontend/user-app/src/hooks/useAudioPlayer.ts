import { useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { setPlaying, setCurrentAudio } from '../store/slices/audioSlice'

export const useAudioPlayer = () => {
  const dispatch = useDispatch()
  const { currentAudio, isPlaying, volume } = useSelector((state: RootState) => state.audio)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (currentAudio && !audioRef.current) {
      audioRef.current = new Audio(currentAudio)
      audioRef.current.volume = volume
    }

    if (audioRef.current) {
      audioRef.current.volume = volume
    }
  }, [currentAudio, volume])

  useEffect(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.play()
      } else {
        audioRef.current.pause()
      }
    }
  }, [isPlaying])

  const playAudio = (audioUrl: string) => {
    dispatch(setCurrentAudio(audioUrl))
    dispatch(setPlaying(true))
  }

  const stopAudio = () => {
    dispatch(setPlaying(false))
  }

  return {
    playAudio,
    stopAudio,
    isPlaying,
    currentAudio
  }
}
