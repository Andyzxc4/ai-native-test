import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { RootState } from '../store/store'
import { setConnected, setError } from '../store/slices/socketSlice'

export const useSocket = () => {
  const dispatch = useDispatch()
  const { token } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (!token) return

    // Mock socket connection for demonstration
    console.log('Socket connected (mock)')
    dispatch(setConnected(true))

    return () => {
      console.log('Socket disconnected (mock)')
      dispatch(setConnected(false))
    }
  }, [token, dispatch])
}
