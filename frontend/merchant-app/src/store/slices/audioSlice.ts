import { createSlice } from '@reduxjs/toolkit'

interface AudioState {
  currentAudio: string | null
  isPlaying: boolean
  volume: number
}

const initialState: AudioState = {
  currentAudio: null,
  isPlaying: false,
  volume: 1.0
}

const audioSlice = createSlice({
  name: 'audio',
  initialState,
  reducers: {
    setCurrentAudio: (state, action) => {
      state.currentAudio = action.payload
    },
    setPlaying: (state, action) => {
      state.isPlaying = action.payload
    },
    setVolume: (state, action) => {
      state.volume = action.payload
    },
    clearAudio: (state) => {
      state.currentAudio = null
      state.isPlaying = false
    }
  }
})

export const { setCurrentAudio, setPlaying, setVolume, clearAudio } = audioSlice.actions
export default audioSlice.reducer
